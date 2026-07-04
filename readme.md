# ⚡ SentimentPulse · Azure AI Language Studio (Project 2)

A state-of-the-art web application and interactive studio built for **Microsoft Azure Cognitive Services**, demonstrating real-time natural language processing, review sentiment classification, confidence score distributions, and sentence-level opinion mining.

---

## 🌟 Overview

**SentimentPulse** transforms simple text review analysis into an enterprise-grade AI diagnostic dashboard. Built with vanilla HTML5, CSS3 (with custom variables and dark glassmorphic styling), and modular JavaScript, this studio allows developers and cloud enthusiasts to experiment with the **Azure Cognitive Services Language REST API (`v2023-04-01`)**.

### ✨ Key Features

- **🎯 Real-Time Valence Gauge (Sentiment Orb)**: An animated visual hero component that dynamically changes color, glow, and rotation speed based on the detected emotional valence (Positive, Negative, Neutral, or Mixed).
- **📊 Confidence Score Distribution**: Visualizes exact percentage confidence breakdowns returned by the Azure AI Language model across all three sentiment dimensions.
- **🔍 Sentence-Level Opinion Mining**: Automatically breaks down multi-sentence reviews and displays sentence-by-sentence sentiment classification tags.
- **⚙️ Interactive API Configuration & Demo Mode**:
  - **Demo Mode**: Enabled by default! Tests the UI and analytics instantly using simulated Azure AI JSON responses with realistic network latency without requiring an API key.
  - **Live Azure API Mode**: Connect your live Azure Cognitive Services endpoint and subscription key to perform real-time sentiment analysis against Microsoft cloud servers.
- **📈 Session Telemetry & Analytics**: Integrated with **Chart.js** to track session sentiment distributions (Doughnut chart) and maintain an activity log with query latency timestamps.
- **💡 Quick-Test Sample Chips**: Pre-populated one-click review samples (5-star praise, critical feedback, balanced opinion, and mixed feelings) for instant UI demonstrations.

---

## 🏗️ Architecture & File Structure

```
project 2/
├── index.html    # Semantic HTML5 studio layout, KPI cards, and modal drawers
├── style.css     # Premium dark-mode design system, glassmorphism, animations
├── index.js      # Core AI engine, Azure REST API client, Chart.js & DOM logic
└── readme.md     # Project documentation and setup guide
```

---

## 🚀 Getting Started

### 1. Running Locally (Demo Mode)

Since this application is built using standard web technologies with no complex build steps required:
1. Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox, or Safari).
2. The studio launches in **Demo Mode** by default.
3. Click any of the **Quick Test Sample Review** chips or type your own review in the text box.
4. Click **⚡ Analyze Sentiment** to see the interactive orb, confidence gauges, and analytics charts update in real time.

---

### 2. Connecting to Live Azure Cognitive Services

To connect this application to real Microsoft Azure cloud servers:

#### Step 1: Create an Azure AI Language Resource
1. Log into the [Azure Portal](https://portal.azure.com/).
2. Create a new **Language** resource under **Azure AI services**.
3. Choose your preferred pricing tier (the **Free F0** tier includes 5,000 text records/month).
4. Once deployed, navigate to **Keys and Endpoint** in the resource menu.

#### Step 2: Configure in SentimentPulse Studio
1. In the studio UI, click **⚙️ API Settings** in the hero section.
2. Paste your **Azure Endpoint URL** (e.g., `https://your-resource-name.cognitiveservices.azure.com/`).
3. Paste **Key 1** or **Key 2** into the **Subscription Key** field.
4. Uncheck **Enable Demo Mode** and click **💾 Save Key**.
5. Your reviews will now be processed directly by Azure Cognitive Services!

---

## 📡 Azure REST API Reference

When running in Live Mode, SentimentPulse communicates with Azure using the following specification:

- **HTTP Method**: `POST`
- **Endpoint URL**: `{Endpoint}/language/:analyze-text?api-version=2023-04-01`
- **Required Headers**:
  - `Content-Type: application/json`
  - `Ocp-Apim-Subscription-Key: {Your-Azure-Key}`
- **Request Payload Structure**:
  ```json
  {
    "kind": "SentimentAnalysis",
    "parameters": {
      "modelVersion": "latest",
      "opinionMining": true
    },
    "analysisInput": {
      "documents": [
        {
          "id": "doc_1",
          "language": "en",
          "text": "The battery life is amazing and the display is super crisp!"
        }
      ]
    }
  }
  ```

---

## 🎨 Design System & Aesthetics

- **Typography**: Uses modern Google Fonts (`Outfit` for headings, `Inter` for body copy, and `JetBrains Mono` for telemetry and metrics).
- **Color Palettes**:
  - **Azure Brand**: `#0078D4` / `#38bdf8`
  - **Positive Valence**: `#10b981` (Emerald Glow)
  - **Negative Valence**: `#ef4444` (Ruby Glow)
  - **Neutral Valence**: `#f59e0b` (Amber Glow)
  - **Mixed Valence**: `#8b5cf6` (Amethyst Glow)
- **Responsive Layout**: CSS Grid and Flexbox structures ensure seamless usability across desktop, tablet, and mobile displays.

---

## 📄 License

This project is part of the Microsoft Azure Cloud Bootcamp repository and is licensed under the MIT License. Feel free to use, modify, and expand for learning and production prototypes.
