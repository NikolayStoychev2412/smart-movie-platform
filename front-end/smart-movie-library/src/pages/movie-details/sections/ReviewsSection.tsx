import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import ReviewCard from "../components/ReviewCard";
import ReviewForm from "../forms/ReviewForm";
import EditReviewForm from "../forms/EditReviewForm";
import type { ReviewWithSentiment } from "../types";
import type { Review } from "../../../types";

export default function ReviewsSection({
  movieId,
  theme,
  language,
  isAuthenticated,
  reviews,
  userHasReviewed,
  editingReview,
  currentUserId,
  onReviewAdded,
  onEditReview,
  onSaveEdit,
  onCancelEdit,
  onDeleteReview,
}: {
  movieId: number;
  theme: string;
  language: string;
  isAuthenticated: boolean;
  reviews: ReviewWithSentiment[];
  userHasReviewed: boolean;
  editingReview: ReviewWithSentiment | null;
  currentUserId?: number;
  onReviewAdded: (review: Review) => void;
  onEditReview: (review: ReviewWithSentiment) => void;
  onSaveEdit: (review: Review) => void;
  onCancelEdit: () => void;
  onDeleteReview: (reviewId: number) => void;
}) {
  const navigate = useNavigate();

  return (
    <section>
      <h2 className={`text-2xl font-bold mb-5 flex items-center gap-2 text-text`}>
        <MessageSquare className="w-6 h-6" />
        {language==="bg"?"Ревюта":"Reviews"}
        {reviews.length > 0 && <span className="text-base font-normal text-muted">({reviews.length})</span>}
      </h2>

      {/* Review Form - show if logged in and hasn't reviewed */}
      {isAuthenticated && !userHasReviewed && (
        <div className="mb-6">
          <ReviewForm
            movieId={movieId}
            theme={theme}
            language={language}
            onReviewAdded={onReviewAdded}
          />
        </div>
      )}

      {/* Login prompt if not authenticated */}
      {!isAuthenticated && (
        <div className={`p-5 rounded-lg mb-6 text-center ${theme==="dark"?"bg-surface-2":"bg-white border"}`}>
          <p className={`mb-3 ${theme==="dark"?"text-muted":"text-muted"}`}>
            {language==="bg"?"Влезте, за да напишете ревю":"Log in to write a review"}
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: `/movie/${movieId}` } })}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {language==="bg"?"Вход":"Log In"}
          </button>
        </div>
      )}

      {/* Edit Review Form */}
      {editingReview && (
        <div className="mb-6">
          <EditReviewForm
            review={editingReview}
            theme={theme}
            language={language}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
          />
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((r, i) => (
            <ReviewCard
              key={r.id || i}
              review={r}
              theme={theme}
              language={language}
              currentUserId={currentUserId}
              onEdit={onEditReview}
              onDelete={onDeleteReview}
            />
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 rounded-lg ${theme==="dark"?"bg-surface-2 text-muted":"bg-surface-2 text-muted"}`}>
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{language==="bg"?"Все още няма ревюта":"No reviews yet"}</p>
          <p className="text-sm mt-1">{language==="bg"?"Бъдете първият!":"Be the first to review!"}</p>
        </div>
      )}
    </section>
  );
}
