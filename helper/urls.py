#set up django url for views
from django.urls import path

from .views import *

urlpatterns = [
    path('', home, name='home'),
    path('about/', about, name='about'),
    path('posts/', PostListView.as_view(), name='posts'),

    path('user/<str:username>', UserPostListView.as_view(), name='user-posts'),
    path('post/<int:pk>/', PostDetailView.as_view(), name='post-detail'),
    path('post/new/', PostCreateView.as_view(), name='post-create'),
    path('post/<int:pk>/update/', PostUpdateView.as_view(), name='post-update'),
    path('post/<int:pk>/delete/', PostDeleteView.as_view(), name='post-delete'),

    path('post/<int:pk>/like/', like_post, name='like-post'),
    path('post/<int:pk>/dislike/', dislike_post, name='dislike-post'),

    path('post/<int:pk>/new-comment/', CommentCreateView.as_view(), name='comment-create'),
    path('comments/<int:pk>/update/', CommentUpdateView.as_view(), name='comment-update'),
    path('comments/<int:pk>/delete/', CommentDeleteView.as_view(), name='comment-delete'),

    path('user/<str:username>/my-requests', UserRequestPostEditListView.as_view(), name='user-my-requests'),
    path('post/<int:pk>/request-edits', RequestPostEditListView.as_view(), name='post-edit-list'),
    path('post/<int:pk>/request-edits/new/', RequestPostEditCreateView.as_view(), name='post-edit-create'),
    path('request-edits/<int:pk>/update/', RequestPostEditUpdateView.as_view(), name='post-edit-update'),
    path('request-edits/<int:pk>/delete/', RequestPostEditDeleteView.as_view(), name='post-edit-delete'),

    path('other-posts/', other_posts, name='other-posts'),
]