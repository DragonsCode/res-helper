# Generated by Django 4.2.7 on 2023-11-11 15:48

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from ..models import Liked

def del_liked(apps, schema_editor):
    Liked.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('helper', '0003_liked_delete_otherpost'),
    ]

    operations = [
        migrations.RunPython(del_liked),
        migrations.AlterField(
            model_name='liked',
            name='author',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, unique=True),
        ),
    ]
