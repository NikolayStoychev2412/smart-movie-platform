from sqlalchemy import Column, Integer, String, Float, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Movie(Base):
    __tablename__ = "movies"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)  # ✅ Added index
    genre = Column(String, nullable=False, index=True)  # ✅ Added index
    summary = Column(Text)
    poster_url = Column(String)
    average_rating = Column(Float, default=0.0, index=True)  # ✅ Added index
    
    # Relationships
    reviews = relationship("Review", back_populates="movie", cascade="all, delete")