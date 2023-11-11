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


class OtherPost(models.Model):
    title = models.CharField(max_length=100)
    sphere = models.CharField(max_length=100)
    source = models.CharField(max_length=100)
    url = models.CharField(max_length=100)
    content = models.TextField()
    date_posted = models.CharField(max_length=100)
    author = models.CharField(max_length=100)

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('other-post-detail', kwargs={'pk': self.pk})


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