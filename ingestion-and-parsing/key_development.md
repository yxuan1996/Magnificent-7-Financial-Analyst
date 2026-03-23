# Key Development

Not all pdf shareholder reports are ingested. 

- Apple does not typically release a glossy annual report to shareholders. Form 10-K serves as their annual report.
- Meta Annual Shareholder Reports are excluded
- Tesla Annual Shareholder Reports are excluded since their reports are too long (500 pages)

As such, the following cypher queries were manually run to insert `key_development` nodes for those companies. 

## AAPL

2023
```
WITH "AAPL_2023_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "AAPL",
    fiscal_year: 2023,
    title: "iPhone 15 Launch with USB-C",
    description: "Apple launched iPhone 15 lineup with USB-C charging, partly driven by EU regulatory requirements.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "AAPL",
    fiscal_year: 2023,
    title: "EU Digital Markets Act Impact",
    description: "EU Digital Markets Act introduced new requirements affecting Apple's App Store policies and ecosystem control.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "AAPL",
    fiscal_year: 2023,
    title: "Epic Games Antitrust Litigation",
    description: "Apple continued legal proceedings and appeals related to the Epic Games antitrust case over App Store practices.",
    category: "Litigation",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```

2024
```
WITH "AAPL_2024_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "AAPL",
    fiscal_year: 2024,
    title: "Apple Vision Pro Launch",
    description: "Apple launched Vision Pro, entering the spatial computing market with a new product category.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "AAPL",
    fiscal_year: 2024,
    title: "Apple Intelligence Announcement",
    description: "Apple introduced Apple Intelligence, integrating generative AI capabilities across its ecosystem.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "AAPL",
    fiscal_year: 2024,
    title: "DMA Enforcement in EU",
    description: "Apple implemented changes to comply with EU DMA, including support for alternative app distribution and payments.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "AAPL",
    fiscal_year: 2024,
    title: "DOJ Antitrust Lawsuit",
    description: "The U.S. Department of Justice filed an antitrust lawsuit against Apple over alleged monopolistic practices.",
    category: "Litigation",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```

2025
```
WITH "AAPL_2025_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "AAPL",
    fiscal_year: 2025,
    title: "Expansion of Apple Intelligence",
    description: "Apple expanded its generative AI capabilities across devices, embedding AI deeper into its ecosystem.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "AAPL",
    fiscal_year: 2025,
    title: "Ongoing Global Regulatory Scrutiny",
    description: "Apple continued to face regulatory scrutiny globally, particularly related to App Store policies and competition.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "AAPL",
    fiscal_year: 2025,
    title: "Continuation of Antitrust Litigation",
    description: "Apple continued to defend against antitrust lawsuits, including the U.S. DOJ case and other global legal challenges.",
    category: "Litigation",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```

## META

2023
```
WITH "META_2023_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "META",
    fiscal_year: 2023,
    title: "Year of Efficiency Restructuring",
    description: "Meta implemented cost-cutting measures including layoffs and organizational restructuring to improve efficiency.",
    category: "Restructuring",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2023,
    title: "Threads Launch",
    description: "Meta launched Threads, a social media platform competing with Twitter/X.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2023,
    title: "Meta AI and LLaMA Development",
    description: "Meta advanced its AI capabilities with LLaMA models and AI integration across products.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2023,
    title: "GDPR Enforcement Actions",
    description: "Meta faced significant fines and regulatory actions in the EU related to data privacy under GDPR.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2023,
    title: "Ongoing Privacy and Antitrust Litigation",
    description: "Meta continued to face lawsuits related to privacy practices and alleged anticompetitive behavior.",
    category: "Litigation",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```

2024
```
WITH "META_2024_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "META",
    fiscal_year: 2024,
    title: "Llama 3 Release",
    description: "Meta released Llama 3, expanding its open-weight large language model capabilities.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2024,
    title: "Meta AI Assistant Expansion",
    description: "Meta expanded its AI assistant across WhatsApp, Instagram, and Facebook platforms.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2024,
    title: "DMA Compliance in EU",
    description: "Meta implemented changes to comply with the EU Digital Markets Act, affecting data usage and advertising.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2024,
    title: "FTC Antitrust Case Continuation",
    description: "Meta continued to defend against FTC antitrust claims regarding past acquisitions.",
    category: "Litigation",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2024,
    title: "AI-Focused Resource Reallocation",
    description: "Meta continued restructuring efforts focusing on AI investments and cost discipline.",
    category: "Restructuring",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```

2025
```
WITH "META_2025_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "META",
    fiscal_year: 2025,
    title: "Scaling of Meta AI Ecosystem",
    description: "Meta scaled AI capabilities across its platforms, integrating AI into ads, content, and user interactions.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2025,
    title: "Global AI and Data Regulation Pressure",
    description: "Meta faced increasing regulatory scrutiny globally related to AI, data privacy, and competition.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2025,
    title: "Continuation of Legal Challenges",
    description: "Meta continued to face legal challenges including FTC antitrust and global privacy litigation.",
    category: "Litigation",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "META",
    fiscal_year: 2025,
    title: "AI Capex Guidance Increase",
    description: "Meta signaled increased capital expenditure guidance focused on AI infrastructure and long-term growth.",
    category: "GuidanceChange",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```

## TSLA

2023
```
WITH "TSLA_2023_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "TSLA",
    fiscal_year: 2023,
    title: "Cybertruck Initial Deliveries",
    description: "Tesla began initial deliveries of the Cybertruck, marking the launch of a new vehicle platform.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2023,
    title: "Vehicle Price Cuts Strategy",
    description: "Tesla implemented significant price reductions across its vehicle lineup to drive demand, impacting margins.",
    category: "Restructuring",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2023,
    title: "Autopilot Regulatory Scrutiny",
    description: "Tesla faced investigations by regulators into Autopilot and Full Self-Driving safety performance.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2023,
    title: "Autopilot Litigation Cases",
    description: "Tesla faced lawsuits related to accidents and safety concerns involving Autopilot systems.",
    category: "Litigation",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```

2024
```
WITH "TSLA_2024_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "TSLA",
    fiscal_year: 2024,
    title: "Cybertruck Production Ramp",
    description: "Tesla ramped production of the Cybertruck to scale deliveries.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2024,
    title: "AI and FSD Development",
    description: "Tesla continued development of Full Self-Driving and AI infrastructure including Dojo.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2024,
    title: "Autopilot Recall and Compliance",
    description: "Tesla implemented software updates and recalls to comply with regulatory requirements on Autopilot systems.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2024,
    title: "Ongoing Autopilot Litigation",
    description: "Tesla continued to face lawsuits related to Autopilot system safety and liability.",
    category: "Litigation",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2024,
    title: "EV Growth Guidance Adjustment",
    description: "Tesla signaled a slower growth outlook for EV deliveries compared to prior expectations.",
    category: "GuidanceChange",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```

2025
```
WITH "TSLA_2025_FORM_10K" AS document_id
UNWIND [
  {
    company_ticker: "TSLA",
    fiscal_year: 2025,
    title: "Next-Gen EV Platform Development",
    description: "Tesla progressed development of a lower-cost next-generation electric vehicle platform.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2025,
    title: "Optimus and Robotics Expansion",
    description: "Tesla expanded its AI and robotics initiatives including the Optimus humanoid robot.",
    category: "ProductLaunch",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2025,
    title: "Global Autonomy Regulation Pressure",
    description: "Tesla continued to face regulatory scrutiny globally on autonomous driving technologies.",
    category: "RegulatoryAction",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2025,
    title: "Continuation of Autopilot Litigation",
    description: "Tesla remained involved in ongoing lawsuits related to Autopilot safety and liability.",
    category: "Litigation",
    document_type: "FORM_10K"
  },
  {
    company_ticker: "TSLA",
    fiscal_year: 2025,
    title: "Operational Cost Optimization",
    description: "Tesla focused on cost optimization and efficiency improvements amid increasing EV competition.",
    category: "Restructuring",
    document_type: "FORM_10K"
  }
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kd:key_development {
  company_ticker: row.company_ticker,
  fiscal_year: row.fiscal_year,
  title: row.title
})
SET kd.description = row.description,
    kd.category = row.category,
    kd.document_type = row.document_type

MERGE (d)-[:MENTIONS]->(kd);
```
