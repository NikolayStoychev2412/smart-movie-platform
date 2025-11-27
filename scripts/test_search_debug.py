#!/usr/bin/env python3
"""
Analyze search quality and similarity scores
Usage: python scripts/analyze_search_quality.py
"""
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from app.database import SessionLocal
from app.ai.embeddings import get_embedding
from app.ai.vector_store import get_vector_store
from app.ai.semantic_search import semantic_search

print("\n" + "="*70)
print("🔍 SEMANTIC SEARCH QUALITY ANALYSIS")
print("="*70 + "\n")

db = SessionLocal()
vector_store = get_vector_store()

# Test queries with different specificity
test_queries = [
    "action movie",
    "romantic comedy",
    "space",
    "thriller",
    "movies about love",
    "dark psychological thriller",
    "feel good family movie",
    "sci-fi adventure in space"
]

print("Testing various queries to see similarity scores...\n")

for query in test_queries:
    print(f"📝 Query: '{query}'")
    
    # Get raw vector store results (no filtering)
    query_vector = get_embedding(query)
    raw_results = vector_store.search(query_vector, top_k=10)
    
    print(f"   Raw results from vector store: {len(raw_results)}")
    
    if raw_results:
        scores = [score for _, score in raw_results]
        print(f"   📊 Score range: {min(scores):.3f} - {max(scores):.3f}")
        print(f"   📈 Average score: {sum(scores)/len(scores):.3f}")
        print(f"   🎯 Top 3 scores: {[f'{s:.3f}' for s in scores[:3]]}")
        
        # Count how many would pass different thresholds
        thresholds = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5]
        print(f"   🚪 Results passing thresholds:")
        for threshold in thresholds:
            count = sum(1 for s in scores if s >= threshold)
            print(f"      min_score={threshold}: {count} results")
    else:
        print(f"   ❌ No results!")
    
    # Test semantic_search function with default params
    semantic_results = semantic_search(db, query, top_k=5)
    print(f"   ✅ semantic_search() returned: {len(semantic_results)} results")
    
    print()

print("="*70)
print("📋 RECOMMENDATIONS")
print("="*70)

# Analyze all similarity scores
all_scores = []
for query in ["action", "romance", "thriller", "comedy", "drama"]:
    query_vector = get_embedding(query)
    results = vector_store.search(query_vector, top_k=20)
    all_scores.extend([score for _, score in results])

if all_scores:
    print(f"\n📊 Overall statistics from {len(all_scores)} searches:")
    print(f"   Min score: {min(all_scores):.3f}")
    print(f"   Max score: {max(all_scores):.3f}")
    print(f"   Average: {sum(all_scores)/len(all_scores):.3f}")
    print(f"   Median: {sorted(all_scores)[len(all_scores)//2]:.3f}")
    
    # Percentiles
    sorted_scores = sorted(all_scores, reverse=True)
    print(f"\n   📈 Score distribution:")
    print(f"      Top 10%: {sorted_scores[len(sorted_scores)//10]:.3f}")
    print(f"      Top 25%: {sorted_scores[len(sorted_scores)//4]:.3f}")
    print(f"      Top 50%: {sorted_scores[len(sorted_scores)//2]:.3f}")
    
    # Recommendation
    recommended_threshold = sorted_scores[len(sorted_scores)//2] * 0.8
    print(f"\n💡 RECOMMENDED SETTINGS:")
    print(f"   • Set min_score default to: {recommended_threshold:.3f}")
    print(f"   • Or remove min_score parameter entirely (use 0.0)")
    print(f"   • Your current embeddings produce relatively LOW similarity scores")
    print(f"   • This is NORMAL for sentence-transformers models!")

print("\n" + "="*70 + "\n")

db.close()