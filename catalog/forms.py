# catalog/forms.py
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.utils.text import slugify
from .models import (
    Factory, Product, ProductImage, Category,
    Purity, MetalColor, Style, InsertType, Coating, Theme
)


class FactoryRegistrationForm(UserCreationForm):
    """Форма регистрации завода"""
    FLOWBITE_INPUT_CLASSES = 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'
    FLOWBITE_TEXTAREA_CLASSES = 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'

    email = forms.EmailField(required=True, label="Email", widget=forms.EmailInput(attrs={'class': FLOWBITE_INPUT_CLASSES}))
    factory_name = forms.CharField(max_length=200, label="Название завода", widget=forms.TextInput(attrs={'class': FLOWBITE_INPUT_CLASSES}))
    address = forms.CharField(max_length=300, label="Адрес", widget=forms.TextInput(attrs={'class': FLOWBITE_INPUT_CLASSES}))
    phone = forms.CharField(max_length=20, label="Телефон", widget=forms.TextInput(attrs={'class': FLOWBITE_INPUT_CLASSES}))
    description = forms.CharField(widget=forms.Textarea(attrs={'class': FLOWBITE_TEXTAREA_CLASSES, 'rows': 4}), required=False, label="Описание завода")

    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')
        labels = {
            'username': 'Имя пользователя',
            'password1': 'Пароль',
            'password2': 'Подтверждение пароля',
        }
        widgets = {
            'username': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({'class': self.FLOWBITE_INPUT_CLASSES})
        self.fields['password2'].widget.attrs.update({'class': self.FLOWBITE_INPUT_CLASSES})

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
            'name': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'description': forms.Textarea(attrs={'rows': 4, 'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'address': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'phone': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'email': forms.EmailInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'logo': forms.FileInput(attrs={'class': 'block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none'}),
        }


class ProductForm(forms.ModelForm):
    """Форма добавления/редактирования товара с новыми характеристиками"""

    class Meta:
        model = Product
        fields = [
            'category', 'material', 'name', 'description', 'manufacturer_brand',
            'purity', 'metal_color', 'style',
            'metal_weight', 'total_weight', 'size',
            'price', 'stock_quantity',
            'has_inserts', 'insert_types', 'insert_description',
            'coatings', 'has_stamp', 'stamp_description',
            'is_active', 'reference_photo_type', 'width_mm', 'height_mm', 'diameter_mm',
            'show_ruler', 'editor_data'
        ]
        labels = {
            'category': 'Категория',
            'material': 'Материал',
            'name': 'Название',
            'description': 'Описание',
            'manufacturer_brand': 'Производитель/Бренд',
            'purity': 'Проба',
            'metal_color': 'Цвет металла',
            'style': 'Стиль',
            'metal_weight': 'Масса металла (г)',
            'total_weight': 'Общая масса изделия (г)',
            'size': 'Размер',
            'price': 'Цена ($)',
            'stock_quantity': 'Количество на складе',
            'has_inserts': 'Наличие вставок',
            'insert_types': 'Типы вставок',
            'insert_description': 'Описание вставок',
            'coatings': 'Покрытия',
            'has_stamp': 'Наличие клейма',
            'stamp_description': 'Описание клейма',
            'is_active': 'Активен (показывать в каталоге)',
            'reference_photo_type': 'Тип эталонного фото',
            'width_mm': 'Ширина (мм)',
            'height_mm': 'Высота (мм)',
            'diameter_mm': 'Диаметр (мм)',
            'show_ruler': 'Показывать линейку на странице товара',
            'editor_data': 'Данные редактора',
        }
        widgets = {
            'category': forms.Select(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'material': forms.Select(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'name': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'description': forms.Textarea(attrs={'rows': 4, 'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'manufacturer_brand': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'purity': forms.Select(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'metal_color': forms.Select(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'style': forms.Select(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'metal_weight': forms.NumberInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5', 'step': '0.01'}),
            'total_weight': forms.NumberInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5', 'step': '0.01'}),
            'size': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'price': forms.NumberInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5', 'step': '0.01'}),
            'stock_quantity': forms.NumberInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'has_inserts': forms.CheckboxInput(attrs={'class': 'w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500'}),
            'insert_types': forms.CheckboxSelectMultiple(),
            'insert_description': forms.Textarea(attrs={'rows': 3, 'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'coatings': forms.CheckboxSelectMultiple(),
            'has_stamp': forms.CheckboxInput(attrs={'class': 'w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500'}),
            'stamp_description': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500'}),
            'reference_photo_type': forms.Select(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'show_ruler': forms.CheckboxInput(attrs={'class': 'w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500'}),
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
        widgets = {
            'image': forms.FileInput(attrs={'class': 'block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none'}),
            'is_main': forms.CheckboxInput(attrs={'class': 'w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500'}),
            'is_reference': forms.CheckboxInput(attrs={'class': 'w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500'}),
            'order': forms.NumberInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
        }


class CustomerRegistrationForm(UserCreationForm):
    """Форма регистрации покупателя"""
    FLOWBITE_INPUT_CLASSES = 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'

    email = forms.EmailField(required=True, label="Email", widget=forms.EmailInput(attrs={'class': FLOWBITE_INPUT_CLASSES}))
    first_name = forms.CharField(max_length=30, required=False, label="Имя", widget=forms.TextInput(attrs={'class': FLOWBITE_INPUT_CLASSES}))
    last_name = forms.CharField(max_length=30, required=False, label="Фамилия", widget=forms.TextInput(attrs={'class': FLOWBITE_INPUT_CLASSES}))

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password1', 'password2')
        labels = {
            'username': 'Имя пользователя',
            'password1': 'Пароль',
            'password2': 'Подтверждение пароля',
        }
        widgets = {
            'username': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({'class': self.FLOWBITE_INPUT_CLASSES})
        self.fields['password2'].widget.attrs.update({'class': self.FLOWBITE_INPUT_CLASSES})

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data.get('first_name', '')
        user.last_name = self.cleaned_data.get('last_name', '')
        if commit:
            user.save()
        return user


class CategoryForm(forms.ModelForm):
    """Форма для создания категории фабрикой"""

    class Meta:
        model = Category
        fields = ['name', 'parent', 'description', 'image']
        labels = {
            'name': 'Название категории',
            'parent': 'Родительская категория (оставьте пустым для главной категории)',
            'description': 'Описание',
            'image': 'Изображение',
        }
        widgets = {
            'name': forms.TextInput(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'parent': forms.Select(attrs={'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'description': forms.Textarea(attrs={'rows': 3, 'class': 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'}),
            'image': forms.FileInput(attrs={'class': 'block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Показываем только главные категории в выборе родительской
        self.fields['parent'].queryset = Category.objects.filter(parent__isnull=True, is_active=True)
        self.fields['parent'].required = False

    def save(self, commit=True, factory=None):
        category = super().save(commit=False)
        if not category.slug:
            category.slug = slugify(category.name)
        if factory:
            category.created_by = factory
        if commit:
            category.save()
        return category


class CharacteristicForm(forms.Form):
    """Универсальная форма для добавления характеристик (проба, цвет, стиль и т.д.)"""
    FLOWBITE_SELECT_CLASSES = 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'
    FLOWBITE_INPUT_CLASSES = 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'
    FLOWBITE_TEXTAREA_CLASSES = 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5'

    characteristic_type = forms.ChoiceField(
        label="Тип характеристики",
        choices=[
            ('purity', 'Проба'),
            ('metal_color', 'Цвет металла'),
            ('style', 'Стиль'),
            ('insert_type', 'Тип вставки'),
            ('coating', 'Покрытие'),
        ],
        widget=forms.Select(attrs={'class': FLOWBITE_SELECT_CLASSES})
    )
    name = forms.CharField(max_length=100, label="Название", widget=forms.TextInput(attrs={'class': FLOWBITE_INPUT_CLASSES}))
    description = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 3, 'class': FLOWBITE_TEXTAREA_CLASSES}),
        required=False,
        label="Описание"
    )

    # Дополнительные поля для проб
    material_type = forms.ChoiceField(
        choices=[('', '---')] + list(Purity._meta.get_field('material_type').choices),
        required=False,
        label="Тип металла",
        widget=forms.Select(attrs={'class': FLOWBITE_SELECT_CLASSES})
    )
    purity_system = forms.ChoiceField(
        choices=[('', '---')] + list(Purity._meta.get_field('system').choices),
        required=False,
        label="Система проб",
        widget=forms.Select(attrs={'class': FLOWBITE_SELECT_CLASSES})
    )

    # Дополнительное поле для типов вставок
    insert_category = forms.ChoiceField(
        choices=[('', '---')] + list(InsertType._meta.get_field('category').choices),
        required=False,
        label="Категория вставки",
        widget=forms.Select(attrs={'class': FLOWBITE_SELECT_CLASSES})
    )


# ThemeForm был удален - тема управляется через AJAX API в theme_editor.html
# См. views: theme_save, theme_load, theme_delete, theme_activate