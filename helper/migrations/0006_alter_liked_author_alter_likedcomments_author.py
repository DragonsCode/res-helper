# Generated by Django 4.2.7 on 2023-11-12 06:52

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('helper', '0005_alter_liked_author_likedcomments'),
    ]

    operations = [
        migrations.AlterField(
            model_name='liked',
            name='author',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, unique=True),
        ),
        migrations.AlterField(
            model_name='likedcomments',
            name='author',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, unique=True),
        ),
    ]