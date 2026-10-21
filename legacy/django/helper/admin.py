from django.contrib import admin
from .models import PostComments, Post, Liked, RequestPostEdit, LikedComments

admin.site.register(Post)
admin.site.register(PostComments)
admin.site.register(RequestPostEdit)
admin.site.register(Liked)
admin.site.register(LikedComments)