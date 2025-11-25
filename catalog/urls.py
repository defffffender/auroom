# catalog/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'catalog'

urlpatterns = [
    # Публичные страницы
    path('', views.home, name='home'),
    path('product/<str:article>/', views.product_detail, name='product_detail'),
    path('product/<str:article>/fullscreen/', views.product_fullscreen, name='product_fullscreen'),
    path('factory/<int:factory_id>/', views.factory_detail, name='factory_detail'),
    
    # Аутентификация
    path('register/', views.customer_register, name='customer_register'),
    path('login/', auth_views.LoginView.as_view(template_name='catalog/login.html'), name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # Избранное
    path('favorites/', views.favorites_list, name='favorites_list'),
    path('favorites/toggle/<str:article>/', views.toggle_favorite, name='toggle_favorite'),
    
    # Личный кабинет завода
    path('dashboard/', views.factory_dashboard, name='factory_dashboard'),
    path('dashboard/profile/', views.factory_profile_edit, name='factory_profile_edit'),
    path('dashboard/product/add/', views.product_add, name='product_add'),
    path('dashboard/product/<str:article>/edit/', views.product_edit, name='product_edit'),
    path('dashboard/product/<str:article>/delete/', views.product_delete, name='product_delete'),

    # Управление категориями и характеристиками
    path('dashboard/category/add/', views.factory_category_add, name='factory_category_add'),
    path('dashboard/characteristic/add/', views.factory_characteristic_add, name='factory_characteristic_add'),

    # Регистрация завода
    path('factory/register/', views.factory_register, name='factory_register'),

    # Редактор темы
    path('theme-editor/', views.theme_editor, name='theme_editor'),
    path('theme/save/', views.theme_save, name='theme_save'),
    path('theme/<int:theme_id>/load/', views.theme_load, name='theme_load'),
    path('theme/<int:theme_id>/delete/', views.theme_delete, name='theme_delete'),
    path('theme/<int:theme_id>/activate/', views.theme_activate, name='theme_activate'),
]