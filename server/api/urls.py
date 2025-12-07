"""
API URL Configuration - RESTful Design
"""
from django.urls import path
from . import views

urlpatterns = [
    # Health check
    path('health', views.health_check, name='health'),
    
    # AI endpoints - Resource-based
    path('ai/groq', views.groq_view, name='groq'),
    path('ai/gemini', views.gemini_view, name='gemini'),
    path('ai/compare', views.compare_view, name='compare'),
    path('ai/compare-with-rubric', views.compare_with_rubric_view, name='compare_with_rubric'),
    
    # Authentication endpoints
    path('auth/register', views.register_view, name='register'),
    path('auth/login', views.login_view, name='login'),
    path('auth/user', views.get_user_view, name='get_user'),
    
    # User resources - RESTful endpoints
    path('users/queries', views.history_view, name='user_queries'),  # GET - List user's queries
    path('users/profile', views.profile_view, name='user_profile'),  # GET/PUT/DELETE - CRUD on profile
]

