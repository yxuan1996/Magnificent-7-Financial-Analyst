# Key Person

Not all pdf shareholder reports are ingested. 

- Apple does not typically release a glossy annual report to shareholders. Form 10-K serves as their annual report.
- Meta Annual Shareholder Reports are excluded
- Tesla Annual Shareholder Reports are excluded since their reports are too long (500 pages)

As such, the following cypher queries were manually run to insert `key_person` nodes for those companies. 

## AAPL

2023
```
WITH "AAPL_2023_FORM_10K" AS document_id
UNWIND [
  {name: "Tim Cook", role: "CEO"},
  {name: "Luca Maestri", role: "CFO"},
  {name: "Jeff Williams", role: "COO"},
  {name: "Arthur D. Levinson", role: "Chairperson"},

  {name: "Tim Cook", role: "BoardMember"},
  {name: "Arthur D. Levinson", role: "BoardMember"},
  {name: "James A. Bell", role: "BoardMember"},
  {name: "Wanda Austin", role: "BoardMember"},
  {name: "Al Gore", role: "BoardMember"},
  {name: "Andrea Jung", role: "BoardMember"},
  {name: "Monica Lozano", role: "BoardMember"},
  {name: "Ronald D. Sugar", role: "BoardMember"},
  {name: "Susan L. Wagner", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```

2024
```
WITH "AAPL_2024_FORM_10K" AS document_id
UNWIND [
  {name: "Tim Cook", role: "CEO"},
  {name: "Luca Maestri", role: "CFO"},
  {name: "Jeff Williams", role: "COO"},
  {name: "Arthur D. Levinson", role: "Chairperson"},

  {name: "Tim Cook", role: "BoardMember"},
  {name: "Arthur D. Levinson", role: "BoardMember"},
  {name: "Wanda Austin", role: "BoardMember"},
  {name: "Alex Gorsky", role: "BoardMember"},
  {name: "Al Gore", role: "BoardMember"},
  {name: "Andrea Jung", role: "BoardMember"},
  {name: "Monica Lozano", role: "BoardMember"},
  {name: "Ronald D. Sugar", role: "BoardMember"},
  {name: "Susan L. Wagner", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```

2025
```
WITH "AAPL_2025_FORM_10K" AS document_id
UNWIND [
  {name: "Tim Cook", role: "CEO"},
  {name: "Kevan Parekh", role: "CFO"},
  {name: "Sabih Khan", role: "COO"},
  {name: "Arthur D. Levinson", role: "Chairperson"},

  {name: "Tim Cook", role: "BoardMember"},
  {name: "Arthur D. Levinson", role: "BoardMember"},
  {name: "Wanda Austin", role: "BoardMember"},
  {name: "Alex Gorsky", role: "BoardMember"},
  {name: "Al Gore", role: "BoardMember"},
  {name: "Andrea Jung", role: "BoardMember"},
  {name: "Monica Lozano", role: "BoardMember"},
  {name: "Ronald D. Sugar", role: "BoardMember"},
  {name: "Susan L. Wagner", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```

## META
2023
```
WITH "META_2023_FORM_10K" AS document_id
UNWIND [
  {name: "Mark Zuckerberg", role: "CEO"},
  {name: "Susan Li", role: "CFO"},
  {name: "Mark Zuckerberg", role: "Chairperson"},

  {name: "Mark Zuckerberg", role: "BoardMember"},
  {name: "Sheryl Sandberg", role: "BoardMember"},
  {name: "Marc Andreessen", role: "BoardMember"},
  {name: "Andrew Houston", role: "BoardMember"},
  {name: "Peggy Alford", role: "BoardMember"},
  {name: "Nancy Killefer", role: "BoardMember"},
  {name: "Tracey T. Travis", role: "BoardMember"},
  {name: "Tony Xu", role: "BoardMember"},
  {name: "Robert M. Kimmitt", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```

2024
```
WITH "META_2024_FORM_10K" AS document_id
UNWIND [
  {name: "Mark Zuckerberg", role: "CEO"},
  {name: "Susan Li", role: "CFO"},
  {name: "Mark Zuckerberg", role: "Chairperson"},

  {name: "Mark Zuckerberg", role: "BoardMember"},
  {name: "Marc Andreessen", role: "BoardMember"},
  {name: "Andrew Houston", role: "BoardMember"},
  {name: "Peggy Alford", role: "BoardMember"},
  {name: "Nancy Killefer", role: "BoardMember"},
  {name: "Tracey T. Travis", role: "BoardMember"},
  {name: "Tony Xu", role: "BoardMember"},
  {name: "Robert M. Kimmitt", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```

2025
```
WITH "META_2025_FORM_10K" AS document_id
UNWIND [
  {name: "Mark Zuckerberg", role: "CEO"},
  {name: "Susan Li", role: "CFO"},
  {name: "Mark Zuckerberg", role: "Chairperson"},

  {name: "Mark Zuckerberg", role: "BoardMember"},
  {name: "Marc Andreessen", role: "BoardMember"},
  {name: "Andrew Houston", role: "BoardMember"},
  {name: "Peggy Alford", role: "BoardMember"},
  {name: "Nancy Killefer", role: "BoardMember"},
  {name: "Tracey T. Travis", role: "BoardMember"},
  {name: "Tony Xu", role: "BoardMember"},
  {name: "Robert M. Kimmitt", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```


## TSLA
2023
```
WITH "TSLA_2023_FORM_10K" AS document_id
UNWIND [
  {name: "Elon Musk", role: "CEO"},
  {name: "Vaibhav Taneja", role: "CFO"},
  {name: "Robyn Denholm", role: "Chairperson"},

  {name: "Elon Musk", role: "BoardMember"},
  {name: "Robyn Denholm", role: "BoardMember"},
  {name: "Ira Ehrenpreis", role: "BoardMember"},
  {name: "Kimbal Musk", role: "BoardMember"},
  {name: "James Murdoch", role: "BoardMember"},
  {name: "Hiromichi Mizuno", role: "BoardMember"},
  {name: "Joe Gebbia", role: "BoardMember"},
  {name: "Kathleen Wilson-Thompson", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```

2024
```
WITH "TSLA_2024_FORM_10K" AS document_id
UNWIND [
  {name: "Elon Musk", role: "CEO"},
  {name: "Vaibhav Taneja", role: "CFO"},
  {name: "Robyn Denholm", role: "Chairperson"},

  {name: "Elon Musk", role: "BoardMember"},
  {name: "Robyn Denholm", role: "BoardMember"},
  {name: "Ira Ehrenpreis", role: "BoardMember"},
  {name: "Kimbal Musk", role: "BoardMember"},
  {name: "James Murdoch", role: "BoardMember"},
  {name: "Hiromichi Mizuno", role: "BoardMember"},
  {name: "Joe Gebbia", role: "BoardMember"},
  {name: "Kathleen Wilson-Thompson", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```

2025
```
WITH "TSLA_2025_FORM_10K" AS document_id
UNWIND [
  {name: "Elon Musk", role: "CEO"},
  {name: "Vaibhav Taneja", role: "CFO"},
  {name: "Robyn Denholm", role: "Chairperson"},

  {name: "Elon Musk", role: "BoardMember"},
  {name: "Robyn Denholm", role: "BoardMember"},
  {name: "Ira Ehrenpreis", role: "BoardMember"},
  {name: "Kimbal Musk", role: "BoardMember"},
  {name: "James Murdoch", role: "BoardMember"},
  {name: "Hiromichi Mizuno", role: "BoardMember"},
  {name: "Joe Gebbia", role: "BoardMember"},
  {name: "Kathleen Wilson-Thompson", role: "BoardMember"}
] AS row

MERGE (d:Document {document_id: document_id})
MERGE (kp:key_person {name: row.name, role: row.role})
MERGE (d)-[:MENTIONS]->(kp);
```

