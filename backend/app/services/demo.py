import secrets
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import (
    Activity,
    Comment,
    Discussion,
    Membership,
    Project,
    Resource,
    Task,
    User,
    Vote,
    now,
)
from app.services.workspaces import create_workspace


def seed_demo(db: Session) -> User:
    """Create an isolated sample workspace. Never authenticate as a shared demo user."""
    suffix = secrets.token_hex(8)
    owner = User(
        name="Алекс", email=f"alex-{suffix}@demo.invalid", password_hash="!",
        discipline="Вычислительная биология", color="sage", is_demo=True,
    )
    db.add(owner)
    db.flush()
    workspace = create_workspace(db, owner, "Open Science Lab", is_demo=True)
    workspace.description = "Место, где разные дисциплины встречаются ради новых открытий."
    teammates = []
    for name, field, color, key in [
        ("Алина Ким", "Нейробиология", "violet", "alina"),
        ("Марк Соколов", "Экология и анализ данных", "peach", "mark"),
        ("София Ахмед", "Открытая наука", "blue", "sofia"),
    ]:
        teammate = User(
            name=name, email=f"{key}-{suffix}@demo.invalid", password_hash="!",
            discipline=field, color=color, is_demo=True,
            bio="Демонстрационный участник исследовательской команды.",
        )
        db.add(teammate)
        db.flush()
        db.add(Membership(workspace_id=workspace.id, user_id=teammate.id, role="member"))
        teammates.append(teammate)
    projects = []
    for title, description, field, color, tags, days in [
        (
            "Нейросети и пластичность мозга",
            "Исследуем, как механизмы нейропластичности помогают создавать более устойчивые модели машинного обучения. Объединяем обзор литературы и воспроизводимые эксперименты.",
            "Нейронаука", "violet", ["Нейронаука", "Machine learning"], 21,
        ),
        (
            "Биоразнообразие городских экосистем",
            "Картируем зелёные пространства и изучаем связь между городской средой и разнообразием видов. Готовим открытый набор данных для дальнейших исследований.",
            "Экология", "sage", ["Экология", "Open data"], 35,
        ),
        (
            "Воспроизводимость в открытой науке",
            "Разрабатываем понятный протокол публикации методов, данных и результатов, чтобы другим командам было проще повторить исследование.",
            "Открытая наука", "peach", ["Методология", "Open science"], 50,
        ),
    ]:
        project = Project(
            workspace_id=workspace.id, owner_id=owner.id, title=title,
            description=description, field=field, color=color, tags=tags,
            due_date=date.today() + timedelta(days=days),
        )
        db.add(project)
        db.flush()
        projects.append(project)
    task_specs = [
        (0, "Собрать статьи о синаптической пластичности", "done", owner, -3),
        (0, "Согласовать гипотезу исследования", "done", teammates[0], -1),
        (0, "Подготовить обзор методов обучения", "in_progress", owner, 0),
        (0, "Обсудить дизайн эксперимента", "todo", teammates[0], 2),
        (1, "Определить территории наблюдений", "done", teammates[1], -2),
        (1, "Проверить набор данных GBIF", "in_progress", owner, 1),
        (1, "Составить протокол полевых наблюдений", "todo", teammates[1], 5),
        (2, "Выбрать исследования для репликации", "done", teammates[2], -1),
        (2, "Описать критерии воспроизводимости", "todo", owner, 3),
        (2, "Подготовить шаблон карточки эксперимента", "todo", teammates[2], 7),
    ]
    for pi, title, status, assignee, day in task_specs:
        db.add(Task(
            workspace_id=workspace.id, project_id=projects[pi].id, title=title, status=status,
            assignee_id=assignee.id, due_date=date.today() + timedelta(days=day),
        ))
    resources = [
        ("Attention Is All You Need", "Vaswani et al.", "https://arxiv.org/abs/1706.03762",
         "paper", ["Machine learning", "Архитектуры"], 2017, 0,
         "Основная статья о трансформерах. Обсудить связь механизмов внимания с биологическими аналогами."),
        ("Global Biodiversity Information Facility", "GBIF", "https://www.gbif.org/",
         "dataset", ["Биоразнообразие", "Open data"], None, 1,
         "Открытые данные о встречаемости видов. Перед анализом проверить лицензии выбранных наборов."),
        ("The FAIR Guiding Principles", "Wilkinson et al.", "https://doi.org/10.1038/sdata.2016.18",
         "paper", ["Методология", "Open science"], 2016, 2,
         "Принципы находимости, доступности, совместимости и повторного использования научных данных."),
        ("Обзор: методы оценки нейропластичности", "Алина Ким", "",
         "note", ["Нейронаука", "Обзор"], 2026, 0,
         "Рабочая заметка демонстрационной команды. Сравнить электрофизиологию, нейровизуализацию и вычислительные подходы. Зафиксировать ограничения каждого метода."),
        ("Estimating the reproducibility of psychological science", "Open Science Collaboration",
         "https://doi.org/10.1126/science.aac4716", "paper", ["Репликация", "Методология"], 2015, 2,
         "Материал для обсуждения методов оценки воспроизводимости."),
        ("Протокол городских наблюдений", "Марк Соколов", "",
         "note", ["Экология", "Полевые данные"], 2026, 1,
         "Для каждой точки фиксируем координаты, время, погодные условия и длительность наблюдения. Не публикуем точные координаты редких видов без проверки."),
    ]
    for i, (title, authors, url, kind, tags, year, pi, notes) in enumerate(resources):
        resource = Resource(
            workspace_id=workspace.id, added_by=teammates[i % 3].id,
            project_id=projects[pi].id, title=title, authors=authors, url=url,
            kind=kind, tags=tags, year=year, notes=notes,
            created_at=now() - timedelta(hours=i * 5),
        )
        db.add(resource)
        db.flush()
        db.add(Activity(
            workspace_id=workspace.id, user_id=resource.added_by, action="добавляет материал",
            subject=title, target_type="resource", target_id=resource.id,
            created_at=now() - timedelta(hours=i * 5 + 1),
        ))
    for i, (title, body, kind, tags) in enumerate([
        ("Как измерять воспроизводимость, а не просто декларировать её?",
         "Предлагаю начать с короткого чек-листа: доступный код, версии зависимостей, исходные данные и описание среды. Какие критерии обязательно добавить для нашего протокола?",
         "question", ["Методология", "Open science"]),
        ("Собрали первые источники по нейропластичности",
         "В библиотеке появились базовые материалы для обзора. Следующий шаг — разделить биологические механизмы и вычислительные аналоги, а затем выбрать проверяемую гипотезу. Приглашаю обсудить структуру обзора.",
         "finding", ["Нейронаука"]),
        ("Открытые данные: качество важнее объёма",
         "Перед объединением наблюдений предлагаю проверить географическое покрытие и сезонность. Иначе модель будет учиться на особенностях сбора данных. Давайте договоримся о критериях фильтрации.",
         "discussion", ["Open data", "Экология"]),
    ]):
        author = teammates[(i + 2) % 3]
        discussion = Discussion(
            workspace_id=workspace.id, author_id=author.id, project_id=projects[(i + 2) % 3].id,
            title=title, body=body, kind=kind, tags=tags,
            created_at=now() - timedelta(hours=3 + i * 8),
        )
        db.add(discussion)
        db.flush()
        for j in range(2):
            db.add(Comment(
                discussion_id=discussion.id, author_id=teammates[j].id,
                body=["Поддерживаю. Давайте зафиксируем критерии в материалах проекта.",
                      "Добавлю примеры из своего направления к следующей встрече."][j],
                created_at=now() - timedelta(hours=i + j),
            ))
            db.add(Vote(user_id=teammates[j].id, discussion_id=discussion.id))
    db.flush()
    return owner
