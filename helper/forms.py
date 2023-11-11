from django import forms
from .models import PostComments

class CommentForm(forms.ModelForm):
    class Meta:
        model = PostComments
        fields = ['content']