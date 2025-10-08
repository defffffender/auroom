# catalog/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'catalog'

urlpatterns = [
    # Публичные страницы
    path('', views.home, name='home'),
    path('product/<str:article>/', views.product_detail, name='product_detail'),
    path('factory/<int:factory_id>/', views.factory_detail, name='factory_detail'),
    
    # Аутентификация
    path('register/', views.customer_register, name='customer_register'),
    path('login/', auth_views.LoginView.as_view(template_name='catalog/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='catalog:home'), name='logout'),
    
    # Избранное
    path('favorites/', views.favorites_list, name='favorites_list'),
    path('favorites/toggle/<str:article>/', views.toggle_favorite, name='toggle_favorite'),
    
    # Личный кабинет завода
    path('dashboard/', views.factory_dashboard, name='factory_dashboard'),
    path('dashboard/profile/', views.factory_profile_edit, name='factory_profile_edit'),
    path('dashboard/product/add/', views.product_add, name='product_add'),
    path('dashboard/product/<str:article>/edit/', views.product_edit, name='product_edit'),
    path('dashboard/product/<str:article>/delete/', views.product_delete, name='product_delete'),
]