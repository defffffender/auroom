# catalog/forms.py
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from .models import Factory, Product, ProductImage


class FactoryRegistrationForm(UserCreationForm):
    """Форма регистрации завода"""
    email = forms.EmailField(required=True, label="Email")
    factory_name = forms.CharField(max_length=200, label="Название завода")
    address = forms.CharField(max_length=300, label="Адрес")
    phone = forms.CharField(max_length=20, label="Телефон")
    description = forms.CharField(widget=forms.Textarea, required=False, label="Описание завода")
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')
        labels = {
            'username': 'Имя пользователя',
            'password1': 'Пароль',
            'password2': 'Подтверждение пароля',
        }
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
            Factory.objects.create(
                user=user,
                name=self.cleaned_data['factory_name'],
                address=self.cleaned_data['address'],
                phone=self.cleaned_data['phone'],
                email=self.cleaned_data['email'],
                description=self.cleaned_data.get('description', ''),
            )
        return user


class FactoryProfileForm(forms.ModelForm):
    """Форма редактирования профиля завода"""
    class Meta:
        model = Factory
        fields = ['name', 'description', 'address', 'phone', 'email', 'logo']
        labels = {
            'name': 'Название завода',
            'description': 'Описание',
            'address': 'Адрес',
            'phone': 'Телефон',
            'email': 'Email',
            'logo': 'Логотип',
        }
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
        }


class ProductForm(forms.ModelForm):
    """Форма добавления/редактирования товара"""
    class Meta:
        model = Product
        fields = [
            'category', 'material', 'name', 'article', 'description',
            'weight', 'size', 'price', 'stock_quantity',
            'has_stones', 'stone_description', 'is_active',
            'reference_photo_type', 'width_mm', 'height_mm', 'diameter_mm',
            'show_ruler', 'editor_data'
        ]
        labels = {
            'category': 'Категория',
            'material': 'Материал',
            'name': 'Название',
            'article': 'Артикул',
            'description': 'Описание',
            'weight': 'Вес (г)',
            'size': 'Размер',
            'price': 'Цена ($)',
            'stock_quantity': 'Количество на складе',
            'has_stones': 'Со вставками',
            'stone_description': 'Описание вставок',
            'is_active': 'Активен (показывать в каталоге)',
            'reference_photo_type': 'Тип эталонного фото',
            'width_mm': 'Ширина (мм)',
            'height_mm': 'Высота (мм)',
            'diameter_mm': 'Диаметр (мм)',
            'show_ruler': 'Показывать линейку на странице товара',
            'editor_data': 'Данные редактора',
        }
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
            'stone_description': forms.Textarea(attrs={'rows': 3}),
            'width_mm': forms.HiddenInput(),
            'height_mm': forms.HiddenInput(),
            'diameter_mm': forms.HiddenInput(),
            'editor_data': forms.HiddenInput(),
        }


class ProductImageForm(forms.ModelForm):
    """Форма добавления фотографий товара"""
    class Meta:
        model = ProductImage
        fields = ['image', 'is_main', 'is_reference', 'order']
        labels = {
            'image': 'Изображение',
            'is_main': 'Главное фото',
            'is_reference': '📏 Эталонное фото',
            'order': 'Порядок отображения',
        }


class CustomerRegistrationForm(UserCreationForm):
    """Форма регистрации покупателя"""
    email = forms.EmailField(required=True, label="Email")
    first_name = forms.CharField(max_length=30, required=False, label="Имя")
    last_name = forms.CharField(max_length=30, required=False, label="Фамилия")
    
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password1', 'password2')
        labels = {
            'username': 'Имя пользователя',
            'password1': 'Пароль',
            'password2': 'Подтверждение пароля',
        }
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data.get('first_name', '')
        user.last_name = self.cleaned_data.get('last_name', '')
        if commit:
            user.save()
        return user