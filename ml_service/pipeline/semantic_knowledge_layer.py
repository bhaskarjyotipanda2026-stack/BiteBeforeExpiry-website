"""
BiteBeforeExpiry — Semantic Knowledge Layer & Vector Retrieval Engine
Constructs graph relationships:
  Product -> contains -> Ingredient
  Ingredient -> belongs_to -> Category
  Ingredient -> may_trigger -> Allergen
  Product -> belongs_to -> Product Class
  Product -> has_attribute -> Storage / Shelf-life

Provides pure-python TF-IDF Vector Embeddings and Cosine Similarity Retrieval
"""

import os
import json
import math
import re

DATA_VERSION = "v1"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed", DATA_VERSION)
SEMANTIC_DIR = os.path.join(BASE_DIR, "data", "semantic", DATA_VERSION)

os.makedirs(SEMANTIC_DIR, exist_ok=True)

# Ingredient Knowledge Base: Roles, Categories, Allergen Triggers, and Explainability
INGREDIENT_TAXONOMY = {
    # Dairy
    "toned milk": {"category": "Dairy Base", "allergen": "Milk & Dairy", "explanation": "Pasteurized cow/buffalo milk with fat content standardized to ~3%."},
    "pasteurized toned milk": {"category": "Dairy Base", "allergen": "Milk & Dairy", "explanation": "Heat-treated milk to eliminate pathogens while preserving calcium and protein."},
    "milk solids": {"category": "Dairy Derivative", "allergen": "Milk & Dairy", "explanation": "Dried milk components containing lactose, casein, and whey."},
    "butter": {"category": "Dairy Fat", "allergen": "Milk & Dairy", "explanation": "Churned cream containing ~80% milk fat."},
    "active lactic culture": {"category": "Fermentation Agent", "allergen": None, "explanation": "Beneficial probiotic bacteria (Lactobacillus) used to culture curd and yogurt."},
    "lactose": {"category": "Milk Sugar / Excipient", "allergen": "Milk & Dairy", "explanation": "Natural milk disaccharide; commonly used as tablet filler in pharmaceuticals."},
    "lactose monohydrate": {"category": "Pharmaceutical Excipient", "allergen": "Milk & Dairy", "explanation": "Inert tablet binder derived from milk whey."},

    # Bakery & Grains
    "refined wheat flour": {"category": "Grain / Cereal", "allergen": "Gluten & Wheat", "explanation": "Milled wheat endosperm with bran removed (Maida)."},
    "whole wheat flour": {"category": "Whole Grain", "allergen": "Gluten & Wheat", "explanation": "Milled whole grain including bran, germ, and endosperm."},
    "corn grits": {"category": "Grain / Cereal", "allergen": None, "explanation": "Coarsely ground dried yellow corn."},
    "rolled oats": {"category": "Whole Grain", "allergen": "Gluten & Wheat", "explanation": "Steamed and flattened oat groats rich in beta-glucan soluble fiber."},
    "yeast": {"category": "Leavening Agent", "allergen": None, "explanation": "Microorganism that ferments sugars producing carbon dioxide to rise bread dough."},

    # Legumes & Nuts
    "peanuts": {"category": "Legume / Nut", "allergen": "Peanuts", "explanation": "High-protein edible seed; primary cause of severe peanut allergic reactions."},
    "refined peanut oil": {"category": "Edible Oil", "allergen": "Peanuts", "explanation": "Extracted oil from peanuts; may retain trace proteins."},
    "almonds": {"category": "Tree Nut", "allergen": "Tree Nuts", "explanation": "Nutrient-dense tree nut high in healthy monounsaturated fats."},
    "cashew nuts": {"category": "Tree Nut", "allergen": "Tree Nuts", "explanation": "Kidney-shaped tree nut; potent allergen trigger."},
    "sesame seeds": {"category": "Oilseed", "allergen": "Sesame Seeds", "explanation": "Calcium-rich oilseed and major allergen."},
    "soy lecithin": {"category": "Emulsifier", "allergen": "Soy", "explanation": "Phospholipid derived from soybeans used to stabilize fat-water mixtures."},

    # Additives & Sweeteners
    "sugar": {"category": "Simple Sweetener", "allergen": None, "explanation": "Refined sucrose for sweetness and preservation."},
    "honey": {"category": "Natural Sweetener", "allergen": None, "explanation": "Natural nectar collected by bees containing glucose and fructose."},
    "citric acid": {"category": "Acidity Regulator", "allergen": None, "explanation": "Natural organic acid (E330) used as a flavor enhancer and natural preservative."},
    "potassium sorbate": {"category": "Preservative", "allergen": None, "explanation": "Food and pharmaceutical antimicrobial preservative (E202)."},
    "sodium benzoate": {"category": "Preservative", "allergen": None, "explanation": "Antimicrobial food preservative active against yeasts and bacteria."},

    # Pharmaceuticals (APIs)
    "paracetamol": {"category": "Analgesic & Antipyretic", "allergen": None, "explanation": "Active pharmaceutical ingredient (API) for pain relief and fever reduction."},
    "ibuprofen": {"category": "NSAID", "allergen": None, "explanation": "Non-steroidal anti-inflammatory drug for pain, swelling, and fever."},
    "amoxicillin trihydrate": {"category": "Penicillin Antibiotic", "allergen": "Penicillin / Beta-Lactam", "explanation": "Bactericidal antibiotic targeting bacterial cell wall synthesis."},
    "potassium clavulanate": {"category": "Beta-Lactamase Inhibitor", "allergen": None, "explanation": "Protects amoxicillin from bacterial enzymatic degradation."},
    "diphenhydramine hydrochloride": {"category": "Antihistamine", "allergen": None, "explanation": "First-generation H1 receptor antagonist for cough and allergy symptoms."},
    "ciprofloxacin hydrochloride": {"category": "Fluoroquinolone Antibiotic", "allergen": None, "explanation": "Broad-spectrum synthetic antimicrobial agent."},
    "pantoprazole sodium sesquihydrate": {"category": "Proton Pump Inhibitor (PPI)", "allergen": None, "explanation": "Gastric acid inhibitor for acid reflux, ulcers, and GERD."},
    "fexofenadine hydrochloride": {"category": "Antihistamine (2nd Gen)", "allergen": None, "explanation": "Non-drowsy peripheral H1 receptor antagonist for allergic rhinitis and urticaria."},
    "salbutamol sulphate": {"category": "Bronchodilator (Beta-2 Agonist)", "allergen": None, "explanation": "Rapid-acting inhalant bronchodilator for asthma and bronchospasm."}
}

class SemanticVectorIndex:
    """
    Pure Python TF-IDF Vector Index & Cosine Similarity Semantic Search
    No external C-extensions required; executes deterministically across all environments.
    """
    def __init__(self):
        self.documents = []
        self.doc_ids = []
        self.metadata = []
        self.vocab = {}
        self.idf = {}
        self.doc_vectors = []

    def _tokenize(self, text):
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
        return tokens

    def fit_transform(self, doc_entries):
        """
        doc_entries: list of dicts with 'id', 'text', 'metadata'
        """
        self.documents = []
        self.doc_ids = []
        self.metadata = []
        doc_token_counts = []
        df = {}

        n_docs = len(doc_entries)
        for entry in doc_entries:
            self.doc_ids.append(entry["id"])
            self.metadata.append(entry.get("metadata", {}))
            text = entry["text"]
            self.documents.append(text)
            tokens = self._tokenize(text)
            counts = {}
            for t in tokens:
                counts[t] = counts.get(t, 0) + 1
            doc_token_counts.append(counts)

            for unique_token in set(tokens):
                df[unique_token] = df.get(unique_token, 0) + 1

        # Vocabulary and IDF
        self.vocab = {term: idx for idx, term in enumerate(sorted(df.keys()))}
        self.idf = {term: math.log((1 + n_docs) / (1 + freq)) + 1.0 for term, freq in df.items()}

        # Compute TF-IDF vectors
        self.doc_vectors = []
        for counts in doc_token_counts:
            vec = {}
            norm_sq = 0.0
            for term, count in counts.items():
                tfidf = count * self.idf.get(term, 1.0)
                vec[term] = tfidf
                norm_sq += tfidf * tfidf
            norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
            unit_vec = {t: val / norm for t, val in vec.items()}
            self.doc_vectors.append(unit_vec)

    def query(self, query_text, top_k=5):
        query_tokens = self._tokenize(query_text)
        if not query_tokens:
            return []

        q_counts = {}
        for t in query_tokens:
            q_counts[t] = q_counts.get(t, 0) + 1

        q_vec = {}
        norm_sq = 0.0
        for term, count in q_counts.items():
            if term in self.idf:
                tfidf = count * self.idf[term]
                q_vec[term] = tfidf
                norm_sq += tfidf * tfidf

        q_norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
        q_unit = {t: val / q_norm for t, val in q_vec.items()}

        scores = []
        for idx, doc_vec in enumerate(self.doc_vectors):
            dot = 0.0
            for term, val in q_unit.items():
                if term in doc_vec:
                    dot += val * doc_vec[term]
            if dot > 0.01:
                scores.append({
                    "id": self.doc_ids[idx],
                    "score": round(dot, 4),
                    "text": self.documents[idx],
                    "metadata": self.metadata[idx]
                })

        scores.sort(key=lambda x: x["score"], reverse=True)
        return scores[:top_k]

def build_semantic_layer():
    processed_path = os.path.join(PROCESSED_DIR, "processed_products.json")
    with open(processed_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    # 1. Build Knowledge Graph (Nodes and Edges)
    nodes = {}
    edges = []

    # Add product nodes
    for p in products:
        nodes[p["id"]] = {
            "type": "Product",
            "name": p["product_name"],
            "brand": p["brand"],
            "product_type": p["product_type"],
            "category": p["category"]
        }
        # Edge: Product -> belongs_to -> Category
        edges.append({
            "source": p["id"],
            "target": f"cat_{p['category'].lower().replace(' ', '_')}",
            "relation": "belongs_to"
        })

        # Edges: Product -> contains -> Ingredients
        for ing in p["ingredients"]:
            ing_node_id = f"ing_{ing.replace(' ', '_')}"
            if ing_node_id not in nodes:
                tax = INGREDIENT_TAXONOMY.get(ing, {})
                nodes[ing_node_id] = {
                    "type": "Ingredient",
                    "name": ing,
                    "category": tax.get("category", "General Food / Excipient"),
                    "allergen": tax.get("allergen"),
                    "explanation": tax.get("explanation", f"Component used in formulation of {p['product_name']}.")
                }
            edges.append({
                "source": p["id"],
                "target": ing_node_id,
                "relation": "contains"
            })

            # Edge: Ingredient -> may_trigger -> Allergen
            tax = INGREDIENT_TAXONOMY.get(ing, {})
            allergen = tax.get("allergen")
            if allergen:
                allergen_id = f"allergen_{allergen.lower().replace(' ', '_').replace('&', 'and')}"
                if allergen_id not in nodes:
                    nodes[allergen_id] = {
                        "type": "Allergen",
                        "name": allergen,
                        "description": f"Recognized high-risk allergen trigger: {allergen}"
                    }
                edges.append({
                    "source": ing_node_id,
                    "target": allergen_id,
                    "relation": "may_trigger"
                })

    graph_data = {
        "version": "semantic-v1",
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "nodes": nodes,
        "edges": edges
    }

    graph_file = os.path.join(SEMANTIC_DIR, "semantic_knowledge_graph.json")
    with open(graph_file, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, indent=2)

    # 2. Build Vector Retrieval Index
    search_entries = []
    # Index Products
    for p in products:
        search_entries.append({
            "id": p["id"],
            "text": f"{p['product_name']} {p['brand']} {p['category']} {' '.join(p['ingredients'])} {p['product_type']}",
            "metadata": {
                "entity_type": "product",
                "name": p["product_name"],
                "brand": p["brand"],
                "category": p["category"],
                "product_type": p["product_type"],
                "allergens": p.get("allergens", []),
                "storage": p.get("storage", "pantry")
            }
        })

    # Index Ingredients
    for ing_name, tax in INGREDIENT_TAXONOMY.items():
        search_entries.append({
            "id": f"ing_{ing_name.replace(' ', '_')}",
            "text": f"{ing_name} {tax.get('category', '')} {tax.get('allergen', '')} {tax.get('explanation', '')}",
            "metadata": {
                "entity_type": "ingredient",
                "name": ing_name,
                "category": tax.get("category"),
                "allergen": tax.get("allergen"),
                "explanation": tax.get("explanation")
            }
        })

    vector_index = SemanticVectorIndex()
    vector_index.fit_transform(search_entries)

    # Save index structures
    index_export = {
        "version": "vector-semantic-v1",
        "num_documents": len(vector_index.documents),
        "vocab_size": len(vector_index.vocab),
        "idf": vector_index.idf,
        "documents": vector_index.documents,
        "doc_ids": vector_index.doc_ids,
        "metadata": vector_index.metadata,
        "doc_vectors": vector_index.doc_vectors
    }

    index_file = os.path.join(SEMANTIC_DIR, "semantic_index.json")
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index_export, f, indent=2)

    print(f"Semantic Knowledge Layer built successfully!")
    print(f"  Knowledge Graph: {len(nodes)} nodes, {len(edges)} edges saved to {graph_file}")
    print(f"  Vector Index:    {len(vector_index.documents)} entries, {len(vector_index.vocab)} vocabulary terms saved to {index_file}")

    # Self-test retrieval
    sample_queries = ["milk powder lactose", "crocin paracetamol fever", "peanut namkeen allergy", "antibiotic capsule"]
    print("\n--- Semantic Retrieval Self-Test ---")
    for q in sample_queries:
        res = vector_index.query(q, top_k=2)
        top_match = res[0] if res else None
        if top_match:
            print(f"Query: '{q}' -> Top: [{top_match['metadata'].get('name')}] (score: {top_match['score']}, type: {top_match['metadata'].get('entity_type')})")

if __name__ == "__main__":
    build_semantic_layer()
