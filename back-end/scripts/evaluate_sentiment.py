#!/usr/bin/env python3
"""
Sentiment Analysis Evaluation Script

Evaluates the ReviewAnalyzer against actual review data.
Uses the user's star rating as ground truth:
  - 1-2 stars  → negative
  - 3 stars    → neutral
  - 4-5 stars  → positive

Outputs:
  - Per-class precision, recall, F1
  - Overall accuracy
  - Confusion matrix
  - Sample misclassifications for analysis

Usage:
    python scripts/evaluate_sentiment.py             # Evaluate all reviews
    python scripts/evaluate_sentiment.py --limit 50  # Evaluate first 50
    python scripts/evaluate_sentiment.py --verbose    # Show every prediction
"""
import sys
import os
import argparse
import time

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.review import Review
from app.models.user import User
from app.database import Base


def rating_to_label(rating: float) -> str:
    """Convert a 1-5 star rating to a sentiment label."""
    if rating <= 2.0:
        return "negative"
    elif rating <= 3.0:
        return "neutral"
    else:
        return "positive"


def run_evaluation(limit: int = 0, verbose: bool = False):
    """Run sentiment evaluation against DB reviews."""

    # -- Connect to DB ---------------------------------------------------
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set in .env")
        sys.exit(1)

    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    db = Session()

    # -- Fetch reviews with text -----------------------------------------
    query = db.query(Review).join(User).filter(
        Review.comment.isnot(None),
        Review.comment != "",
        Review.rating.isnot(None),
    ).order_by(Review.id)

    if limit > 0:
        query = query.limit(limit)

    reviews = query.all()
    db.close()

    if not reviews:
        print("No reviews with comments found in the database.")
        sys.exit(0)

    print(f"\nSentiment Analysis Evaluation")
    print(f"{'=' * 50}")
    print(f"Reviews to evaluate: {len(reviews)}")
    print()

    # -- Load analyzer (lazy, first call loads the model) ----------------
    print("Loading sentiment model...")
    from app.ai.review_analysis import ReviewAnalyzer
    analyzer = ReviewAnalyzer()
    print("Model loaded.\n")

    # -- Run predictions -------------------------------------------------
    LABELS = ["negative", "neutral", "positive"]
    # Confusion matrix: true_label → predicted_label → count
    confusion = {t: {p: 0 for p in LABELS} for t in LABELS}
    correct = 0
    total = 0
    misclassifications = []
    confidences = {"correct": [], "wrong": []}

    start = time.time()

    for i, review in enumerate(reviews):
        true_label = rating_to_label(review.rating)
        result = analyzer.analyze(review.comment)
        pred_label = result["sentiment"].value  # "positive"/"negative"/"neutral"
        conf = result["confidence"]

        confusion[true_label][pred_label] += 1
        total += 1

        if pred_label == true_label:
            correct += 1
            confidences["correct"].append(conf)
        else:
            confidences["wrong"].append(conf)
            misclassifications.append({
                "review_id": review.id,
                "rating": review.rating,
                "true": true_label,
                "predicted": pred_label,
                "confidence": conf,
                "text": review.comment[:120],
            })

        if verbose:
            mark = "OK" if pred_label == true_label else "XX"
            print(f"  [{mark}] #{review.id}  rating={review.rating}  true={true_label:<8}  "
                  f"pred={pred_label:<8}  conf={conf:.3f}  \"{review.comment[:60]}...\"")

        # Progress
        if (i + 1) % 25 == 0:
            print(f"  Processed {i + 1}/{len(reviews)}...")

    elapsed = time.time() - start

    # -- Compute metrics -------------------------------------------------
    accuracy = correct / total if total > 0 else 0

    print(f"\n{'=' * 50}")
    print(f"RESULTS  ({total} reviews, {elapsed:.1f}s)")
    print(f"{'=' * 50}")
    print(f"\nOverall accuracy: {correct}/{total} = {accuracy:.1%}\n")

    # Per-class precision, recall, F1
    print(f"{'Label':<12} {'Precision':>10} {'Recall':>10} {'F1':>10} {'Support':>10}")
    print(f"{'-' * 52}")

    f1_scores = []
    for label in LABELS:
        tp = confusion[label][label]
        # Support = total true instances of this label
        support = sum(confusion[label].values())
        # Predicted as this label
        predicted_as = sum(confusion[t][label] for t in LABELS)

        precision = tp / predicted_as if predicted_as > 0 else 0
        recall = tp / support if support > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        f1_scores.append(f1)

        print(f"{label:<12} {precision:>10.3f} {recall:>10.3f} {f1:>10.3f} {support:>10d}")

    macro_f1 = sum(f1_scores) / len(f1_scores) if f1_scores else 0
    print(f"{'-' * 52}")
    print(f"{'Macro avg':<12} {'':>10} {'':>10} {macro_f1:>10.3f} {total:>10d}")

    # Confusion matrix
    print(f"\nConfusion Matrix (rows=true, cols=predicted):")
    print(f"{'':>12}", end="")
    for p in LABELS:
        print(f" {p:>10}", end="")
    print()
    for t in LABELS:
        print(f"{t:<12}", end="")
        for p in LABELS:
            count = confusion[t][p]
            print(f" {count:>10d}", end="")
        print()

    # Confidence analysis
    avg_correct = sum(confidences["correct"]) / len(confidences["correct"]) if confidences["correct"] else 0
    avg_wrong = sum(confidences["wrong"]) / len(confidences["wrong"]) if confidences["wrong"] else 0
    print(f"\nConfidence analysis:")
    print(f"  Avg confidence on correct predictions: {avg_correct:.3f}")
    print(f"  Avg confidence on wrong predictions:   {avg_wrong:.3f}")

    # Sample misclassifications
    if misclassifications:
        show = min(10, len(misclassifications))
        print(f"\nSample misclassifications ({show} of {len(misclassifications)}):")
        print(f"{'-' * 80}")
        for m in misclassifications[:show]:
            print(f"  Review #{m['review_id']}  rating={m['rating']}  "
                  f"true={m['true']}  pred={m['predicted']}  conf={m['confidence']:.3f}")
            print(f"    \"{m['text']}\"")
            print()

    # Summary line for diploma
    print(f"{'=' * 50}")
    print(f"DIPLOMA SUMMARY: Accuracy={accuracy:.1%}, Macro-F1={macro_f1:.3f}, "
          f"N={total}, Model=nlptown/bert-base-multilingual-uncased-sentiment")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate sentiment analysis accuracy")
    parser.add_argument("--limit", type=int, default=0, help="Max reviews to evaluate (0=all)")
    parser.add_argument("--verbose", action="store_true", help="Show each prediction")
    args = parser.parse_args()

    run_evaluation(limit=args.limit, verbose=args.verbose)
