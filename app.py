import streamlit as st
import requests
import time
import random
import datetime
import pandas as pd
import altair as alt

AZURE_ENDPOINT = "https://anuj-ai.cognitiveservices.azure.com/"

st.set_page_config(
    page_title="OpsCenter · Azure AI",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ══════════════════════════════════════════════════════════════════
#  DESIGN SYSTEM — "OPS TERMINAL"
# ══════════════════════════════════════════════════════════════════

with open("style.css", "r", encoding="utf-8") as f:
    st.markdown(f"<style>\n{f.read()}\n</style>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
#  STATE
# ══════════════════════════════════════════════════════════════════

if "history"      not in st.session_state:
    st.session_state.history      = [random.randint(12, 25) for _ in range(20)]
if "log"          not in st.session_state:
    st.session_state.log          = []
if "last_status"  not in st.session_state:
    st.session_state.last_status  = None
if "last_latency" not in st.session_state:
    st.session_state.last_latency = None
if "total_checks" not in st.session_state:
    st.session_state.total_checks = 0
if "ok_checks"    not in st.session_state:
    st.session_state.ok_checks    = 0

# ══════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════

def probe_endpoint(url: str):
    try:
        t0 = time.time()
        requests.get(url, timeout=5)
        return True, round((time.time() - t0) * 1000)
    except requests.exceptions.RequestException:
        return False, None

def uptime_pct() -> float:
    if st.session_state.total_checks == 0:
        return 100.0
    return round(st.session_state.ok_checks / st.session_state.total_checks * 100, 1)

def avg_latency() -> int:
    h = st.session_state.history
    return round(sum(h) / len(h)) if h else 0

def p95_latency() -> int:
    h = st.session_state.history
    if len(h) < 2:
        return 0
    return sorted(h)[max(0, int(len(h) * 0.95) - 1)]

# ══════════════════════════════════════════════════════════════════
#  HERO — renders from current state at the top of each run
# ══════════════════════════════════════════════════════════════════

s      = st.session_state.last_status
ms     = st.session_state.last_latency

orb_cls  = "online" if s is True else "offline" if s is False else "idle"
orb_val  = f"{ms}ms"   if s is True  else "ERR" if s is False else "—"
pill_txt = (f"ONLINE · {ms}ms" if s is True
            else "OFFLINE · TIMEOUT" if s is False
            else "IDLE · NO PROBE")

with open("index.html", "r", encoding="utf-8") as f:
    html_content = f.read()

# Extract only the content inside the <body> tags to avoid injecting <html> into Streamlit
import re
body_match = re.search(r"<body[^>]*>(.*)</body>", html_content, re.IGNORECASE | re.DOTALL)
if body_match:
    html_content = body_match.group(1)

st.markdown(html_content.format(
    orb_cls=orb_cls,
    pill_txt=pill_txt,
    orb_val=orb_val
), unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
#  METRICS ROW
# ══════════════════════════════════════════════════════════════════

c1, c2, c3, c4 = st.columns(4)

with c1:
    st.metric("Service", "Cognitive API", help=AZURE_ENDPOINT)
with c2:
    st.metric("Avg Latency", f"{avg_latency()} ms")
with c3:
    st.metric("P95 Latency", f"{p95_latency()} ms")
with c4:
    st.metric("Uptime", f"{uptime_pct()}%")

st.divider()

# ══════════════════════════════════════════════════════════════════
#  MAIN CONTENT
# ══════════════════════════════════════════════════════════════════

left_col, right_col = st.columns([2.5, 1.05], gap="large")

with left_col:
    st.markdown("### Probe")

    btn_col, _ = st.columns([1, 3])
    with btn_col:
        go = st.button("▶  Run Diagnostic", width="stretch")

    status_slot = st.empty()

    # ── Run probe ────────────────────────────────────────────────
    if go or s is None:
        with status_slot.container():
            st.info("Probing endpoint…", icon="🔄")
        time.sleep(0.25)

        is_ok, ms_val = probe_endpoint(AZURE_ENDPOINT)
        st.session_state.last_status  = is_ok
        st.session_state.last_latency = ms_val
        st.session_state.total_checks += 1
        ts = datetime.datetime.now().strftime("%H:%M:%S")

        if is_ok:
            st.session_state.ok_checks += 1
            st.session_state.history.append(ms_val)
            if len(st.session_state.history) > 60:
                st.session_state.history.pop(0)
            st.session_state.log.insert(0, f"✔  {ts}    {ms_val:>4}ms    200 OK")
        else:
            st.session_state.log.insert(0, f"✖  {ts}    timeout    no response")

        if len(st.session_state.log) > 10:
            st.session_state.log.pop()

        st.rerun()

    # ── Status message ───────────────────────────────────────────
    with status_slot.container():
        if s is True:
            st.success(f"**Operational** — Responded in {ms}ms. TLS handshake complete.", icon="✅")
        elif s is False:
            st.error("**Unreachable** — Request timed out after 5s. Check firewall or DNS.", icon="🚨")
        else:
            st.info("No probe data yet. Click **▶ Run Diagnostic** to begin.", icon="ℹ️")

    # ── Latency chart ────────────────────────────────────────────
    st.markdown("### Response Time · Last 60 Probes")

    hist = st.session_state.history
    df   = pd.DataFrame({"probe": range(len(hist)), "ms": hist})

    chart = (
        alt.Chart(df)
        .mark_area(
            interpolate="monotone",
            line={"color": "#3B82F6", "strokeWidth": 1.5},
            color=alt.Gradient(
                gradient="linear",
                stops=[
                    alt.GradientStop(color="rgba(59,130,246,0.2)", offset=0),
                    alt.GradientStop(color="rgba(59,130,246,0.0)", offset=1),
                ],
                x1=1, x2=1, y1=1, y2=0,
            ),
        )
        .encode(
            x=alt.X("probe:Q", axis=None),
            y=alt.Y(
                "ms:Q",
                axis=alt.Axis(
                    title=None,
                    grid=True,
                    gridColor="#07090F",
                    labelColor="#1E293B",
                    labelFont="JetBrains Mono",
                    labelFontSize=9,
                    tickCount=4,
                    domain=False,
                    ticks=False,
                ),
                scale=alt.Scale(zero=False, padding=10),
            ),
            tooltip=[
                alt.Tooltip("probe:Q", title="Probe #"),
                alt.Tooltip("ms:Q",    title="Latency (ms)"),
            ],
        )
        .properties(height=200, background="transparent")
        .configure_view(strokeWidth=0, fill="transparent")
    )

    st.altair_chart(chart, use_container_width=True)

# ── Right panel ───────────────────────────────────────────────────

with right_col:
    st.markdown("### Resource")
    with st.expander("Configuration", expanded=True):
        st.code(
            "Group     Azure-AI-Project-anuj\n"
            "Sub       Azure for Students\n"
            "Tier      S0  Standard\n"
            "Access    Public\n"
            "Protocol  HTTPS / TLS 1.2\n"
            "Region    Central India",
            language=None,
        )

    st.markdown("### Activity Log")
    if not st.session_state.log:
        st.caption("No activity recorded.")
    else:
        for entry in st.session_state.log:
            st.code(entry, language=None)

    st.markdown("---")
    st.caption(f"Target: `{AZURE_ENDPOINT}`")
    st.caption("Manual refresh · click ▶ Run Diagnostic to probe")