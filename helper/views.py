from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.models import User
from django.urls import reverse, reverse_lazy
from django.views.decorators.http import require_POST
from django.views.generic import (
    ListView,
    DetailView,
    CreateView,
    UpdateView,
    DeleteView
)
from .models import Post, PostComments, RequestPostEdit, OtherPost
from .forms import CommentForm

def home(request):
    return render(request, 'helper/home.html', {'title': 'Re:Search'})


class PostListView(ListView):
    model = Post
    template_name = 'helper/posts.html'  
    context_object_name = 'posts'
    ordering = ['-likes']
    paginate_by = 5


class UserPostListView(ListView):
    model = Post
    template_name = 'helper/user_posts.html'
    context_object_name = 'posts'
    paginate_by = 5


    def get_queryset(self):
        user = get_object_or_404(User, username=self.kwargs.get('username'))
        return Post.objects.filter(author=user).order_by('-date_posted') 


class PostDetailView(DetailView):
    model = Post
    template_name = 'helper/post_detail.html'
    context_object_name = 'posts'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['comments'] = PostComments.objects.filter(post_id=self.kwargs['pk']).order_by('-date_posted')
        context['comment_form'] = CommentForm()
        return context


@require_POST
def like_post(request, pk):
    post = get_object_or_404(Post, pk=pk)
    post.likes += 1
    post.save()
    return redirect('post-detail', pk=pk)


@require_POST
def dislike_post(request, pk):
    post = get_object_or_404(Post, pk=pk)
    post.dislikes += 1
    post.save()
    return redirect('post-detail', pk=pk)


class CommentCreateView(LoginRequiredMixin, CreateView):
    model = PostComments
    form_class = CommentForm
    template_name = 'helper/comment_create.html'
    success_url = '/'

    def form_valid(self, form):
        form.instance.post = get_object_or_404(Post, pk=self.kwargs['pk'])
        form.instance.author = self.request.user
        return super().form_valid(form)
    
    # def get_success_url(self):
    #     return reverse_lazy('post-detail', kwargs={'pk': self.kwargs['pk']})


class CommentUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = PostComments
    form_class = CommentForm
    template_name = 'comment_update.html'
    success_url = '/'

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

    # def get_success_url(self):
    #     return reverse_lazy('post-detail', kwargs={'pk': self.object.post.pk})


class CommentDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = PostComments
    template_name = 'comment_confirm_delete.html'
    success_url = '/'

    # def get_success_url(self):
    #     return reverse_lazy('post-detail', kwargs={'pk': self.object.post.pk})

    def test_func(self):
        comment = self.get_object()
        if self.request.user == comment.author:
            return True
        return False


class PostCreateView(LoginRequiredMixin, CreateView):
    model = Post
    # template_name = 'post_create.html'
    fields = ['title', 'content']

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)


class PostUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Post
    template_name = 'post_update.html'
    fields = ['title', 'content']

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

    def test_func(self):
        post = self.get_object()
        if self.request.user == post.author:
            return True
        return False


class PostDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Post
    template_name = 'post_confirm_delete.html'
    success_url = '/'

    def test_func(self):
        post = self.get_object()
        if self.request.user == post.author:
            return True
        return False


class OtherPostListView(ListView):
    model = OtherPost
    template_name = 'helper/other_posts.html'  
    context_object_name = 'other-post'
    ordering = ['-date_posted']


class OtherPostDetailView(DetailView):
    model = OtherPost
    template_name = 'helper/other_post_detail.html'
    context_object_name = 'other-post'


class RequestPostEditListView(ListView):
    model = RequestPostEdit
    template_name = 'helper/request_post_edit.html'  
    context_object_name = 'reuqest-post-edit'
    ordering = ['-likes']
    paginate_by = 5

    def get_queryset(self):
        post = get_object_or_404(Post, pk=self.kwargs.get('pk'))
        return RequestPostEdit.objects.filter(post=post).order_by('-date_posted')


class UserRequestPostEditListView(ListView):
    model = RequestPostEdit
    template_name = 'helper/user_request_post_edit_list.html'
    context_object_name = 'reuqest-post-edit'
    paginate_by = 5

    def get_queryset(self):
        user = get_object_or_404(User, username=self.kwargs.get('username'))
        return RequestPostEdit.objects.filter(author=user).order_by('-date_posted')    


class RequestPostEditDetailView(DetailView):
    model = RequestPostEdit
    template_name = 'helper/request_post_edit_detail.html'
    context_object_name = 'reuqest-post-edit'


class RequestPostEditCreateView(LoginRequiredMixin, CreateView):
    model = RequestPostEdit
    template_name = 'helper/request_post_edit_create.html'
    fields = ['content']

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)


class RequestPostEditUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = RequestPostEdit
    template_name = 'helper/request_post_edit_update.html'
    fields = ['content']

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

    def test_func(self):
        post_edit = self.get_object()
        if self.request.user == post_edit.author:
            return True
        return False


class RequestPostEditDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = RequestPostEdit
    template_name = 'helper/request_post_edit_confirm_delete.html'
    success_url = '/'

    def test_func(self):
        post_edit = self.get_object()
        if self.request.user == post_edit.author:
            return True
        return False


def about(request):
    return render(request, 'helper/about.html', {'title': 'About Re:Search Helper'})