from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.urls import reverse


class Post(models.Model):
    title = models.CharField(max_length=100)
    sphere = models.CharField(max_length=100)
    content = models.TextField()
    date_posted = models.DateTimeField(default=timezone.now)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)
    verified = models.BooleanField(default=False)

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('post-detail', kwargs={'pk': self.pk})


class Liked(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    rating = models.IntegerField(default=0)
    date_posted = models.DateTimeField(default=timezone.now)
    author = models.ForeignKey(User, on_delete=models.CASCADE, unique=True)

    def __str__(self):
        return self.post.title

    def get_absolute_url(self):
        return reverse('liked', kwargs={'pk': self.pk})


class PostComments(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    content = models.TextField()
    date_posted = models.DateTimeField(default=timezone.now)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)

    def __str__(self):
        return self.content

    def get_absolute_url(self):
        return reverse('post-comments-detail', kwargs={'pk': self.pk})


class LikedComments(models.Model):
    comment = models.ForeignKey(PostComments, on_delete=models.CASCADE)
    rating = models.IntegerField(default=0)
    date_posted = models.DateTimeField(default=timezone.now)
    author = models.ForeignKey(User, on_delete=models.CASCADE, unique=True)

    def __str__(self):
        return self.comment.content

    def get_absolute_url(self):
        return reverse('liked-comment', kwargs={'pk': self.pk})


class RequestPostEdit(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)
    accepted = models.BooleanField(default=False)

    def __str__(self):
        return self.content

    def get_absolute_url(self):
        return reverse('request-post-edit-detail', kwargs={'pk': self.pk})