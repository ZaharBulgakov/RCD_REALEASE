# DESIGN SYSTEM — RandomChessDebut (RCD)

> Дизайн-система для шахматного тренажёра дебютов. Философия: **точность гроссмейстера, скорость блица**. Каждый элемент либо несёт информацию, либо убирается с доски.

---

## 1. Цветовая палитра

### Акцентные цвета

| Токен                | Hex       | Применение                                      |
|----------------------|-----------|-------------------------------------------------|
| `--color-accent`     | `#E8360A` (тёмная) / `#B8340F` (светлая) | CTA-кнопки, активные состояния, прогресс        |
| `--color-accent-hover` | `#FF4A1C` (тёмная) / `#CC3D12` (светлая) | Hover для акцентных кнопок                    |
| `--color-accent-muted` | `#E8360A26` | Фон акцентных тегов, бейджей               |
| `--color-gold`       | `#C9922A` | Ходы, выделенные позиции, «правильно»           |
| `--color-gold-muted` | `#C9922A1A` | Фон золотых бейджей                          |

### Нейтральная шкала — тема «Тёмный шоколад» (основная)

| Токен              | Hex       | Применение                                      |
|--------------------|-----------|-------------------------------------------------|
| `--gray-950`       | `#0C0806` | Максимально тёмный фон, overlays                |
| `--gray-900`       | `#140D0B` | Основной фон приложения                         |
| `--gray-850`       | `#1D1410` | Фон карточек, модальных окон                    |
| `--gray-800`       | `#281C16` | Вторичный фон, sidebar                          |
| `--gray-700`       | `#3D2B22` | Borders, разделители                            |
| `--gray-600`       | `#543D32` | Disabled borders, inert элементы                |
| `--gray-400`       | `#8C6B5A` | Placeholder, subtitle                           |
| `--gray-200`       | `#C9B3A8` | Вторичный текст                                 |
| `--gray-50`        | `#F2EBE6` | Основной текст                                  |

### Нейтральная шкала — светлая тема «Белый шоколад»

| Токен              | Hex       | Применение                                      |
|--------------------|-----------|-------------------------------------------------|
| `--gray-950`       | `#FDFBF7` | Основной фон приложения                         |
| `--gray-900`       | `#F5EBD7` | Фон секций, sidebar                             |
| `--gray-850`       | `#EBDDC8` | Фон карточек                                    |
| `--gray-800`       | `#DBC4A8` | Вторичный фон, hover на карточках               |
| `--gray-700`       | `#B89B7A` | Borders, разделители                            |
| `--gray-600`       | `#8F7558` | Disabled borders, inert элементы                |
| `--gray-400`       | `#5C4A35` | Placeholder, subtitle, timestamp                |
| `--gray-200`       | `#3A2E1E` | Вторичный текст                                 |
| `--gray-50`        | `#1A100B` | Основной текст                                  |

> **Принцип инверсии:** в светлой теме шкала перевёрнута — `--gray-950` самый светлый (фон), `--gray-50` самый тёмный (текст). Это сохраняет семантику токенов: 950 = фон, 50 = текст.



| Токен                  | Hex       | Применение                         |
|------------------------|-----------|------------------------------------|
| `--color-success`      | `#22C55E` | Правильный ход, успех              |
| `--color-success-muted`| `#22C55E1A` | Фон success-уведомлений          |
| `--color-error`        | `#E8360A` | Неверный ход, ошибка               |
| `--color-error-muted`  | `#E8360A26` | Фон error-уведомлений            |
| `--color-warning`      | `#F59E0B` | Предупреждение, подсказка          |
| `--color-info`         | `#3B82F6` | Нейтральная информация             |

### Цвета доски (неизменяемые)

| Токен                   | Hex       |
|-------------------------|-----------|
| `--board-light`         | `#E8C89A` |
| `--board-dark`          | `#A0714A` |
| `--board-highlight`     | `#F6F669B3` | Последний ход (жёлтый, полупрозрачный) |
| `--board-hint`          | `#22C55E66` | Подсказка следующего хода         |
| `--board-error`         | `#E8360A66` | Неверный ход                      |

---

## 2. Типографическая шкала

### Шрифты

```css
/* Display / Заголовки */
font-family: 'Syne', sans-serif;          /* Geometric grotesque с характером */

/* Body / UI */
font-family: 'JetBrains Mono', monospace; /* Ходы, PGN, нотация — только моно */
font-family: 'Epilogue', sans-serif;      /* Основной UI-текст */
```

> **Почему:** Syne — угловатый, архитектурный, перекликается с сеткой доски. JetBrains Mono делает нотацию частью айдентики, не техническим артефактом. Epilogue — нейтральный, читаемый корпус.

### Размеры

| Токен          | px  | rem    | Применение                              |
|----------------|-----|--------|-----------------------------------------|
| `--text-xs`    | 11  | 0.6875 | Метки, timestamps, бейджи               |
| `--text-sm`    | 13  | 0.8125 | Вспомогательный текст, captions         |
| `--text-base`  | 15  | 0.9375 | Основной текст, описания                |
| `--text-md`    | 17  | 1.0625 | Подзаголовки карточек                   |
| `--text-lg`    | 21  | 1.3125 | Section titles                          |
| `--text-xl`    | 27  | 1.6875 | Page headings                           |
| `--text-2xl`   | 36  | 2.25   | Hero-заголовки                          |
| `--text-3xl`   | 52  | 3.25   | Branding / лендинг                      |

### Начертание (font-weight)

| Токен              | Значение | Применение                        |
|--------------------|----------|-----------------------------------|
| `--weight-regular` | 400      | Body text                         |
| `--weight-medium`  | 500      | Labels, nav                       |
| `--weight-semibold`| 600      | Card titles, кнопки               |
| `--weight-bold`    | 700      | Display, акценты                  |
| `--weight-black`   | 900      | Hero, branding                    |

### Межстрочный интервал

| Токен              | Значение | Применение             |
|--------------------|----------|------------------------|
| `--leading-tight`  | 1.1      | Display-заголовки      |
| `--leading-snug`   | 1.3      | Подзаголовки           |
| `--leading-normal` | 1.5      | Body text              |
| `--leading-relaxed`| 1.7      | Длинные описания       |

---

## 3. Шкала отступов

Базовый юнит: **4px**

| Токен      | px  | rem   | Применение                                   |
|------------|-----|-------|----------------------------------------------|
| `--sp-1`   | 4   | 0.25  | Минимальный gap внутри компонента            |
| `--sp-2`   | 8   | 0.5   | Иконка + лейбл, inline-элементы              |
| `--sp-3`   | 12  | 0.75  | Padding кнопок (вертикаль)                   |
| `--sp-4`   | 16  | 1.0   | Внутренний padding карточек (стандарт)       |
| `--sp-5`   | 20  | 1.25  | Gap между элементами внутри секции           |
| `--sp-6`   | 24  | 1.5   | Padding карточек (увеличенный)               |
| `--sp-8`   | 32  | 2.0   | Gap между карточками в сетке                 |
| `--sp-10`  | 40  | 2.5   | Padding секций (мобайл)                      |
| `--sp-12`  | 48  | 3.0   | Вертикальный ритм между секциями             |
| `--sp-16`  | 64  | 4.0   | Крупные секции, hero padding                 |
| `--sp-24`  | 96  | 6.0   | Отступы между блоками лендинга               |

---

## 4. Шкала радиусов

| Токен        | px  | Применение                                          |
|--------------|-----|-----------------------------------------------------|
| `--r-sm`     | 4   | Теги, бейджи, мелкие inline-элементы                |
| `--r-md`     | 8   | Inputs, кнопки среднего размера                     |
| `--r-lg`     | 12  | Карточки дебютов, dropdown                          |
| `--r-xl`     | 16  | Модальные окна, панели                              |
| `--r-2xl`    | 24  | Крупные CTA-кнопки (hero)                           |
| `--r-full`   | 9999| Пилюли, аватары, иконки-кнопки                      |

> **Принцип:** Доска — прямоугольная, без скруглений. UI-элементы — умеренно скруглены. Только интерактивные pill-кнопки используют `--r-full`.

---

## 5. Компоненты

### 5.1 Button

**Варианты:** `primary` · `secondary` · `ghost` · `danger` · `icon`

```
primary   → bg: --color-accent,  text: white,     radius: --r-2xl
secondary → bg: --gray-800,      text: --gray-50,  border: --gray-700
ghost     → bg: transparent,     text: --gray-200, border: none, hover: --gray-800
danger    → bg: --color-error-muted, text: --color-error
icon      → 36×36px, radius: --r-full, bg: --gray-800
```

**Размеры:**

| Size | Height | Padding H | Font         |
|------|--------|-----------|--------------|
| sm   | 32px   | 12px      | --text-sm    |
| md   | 40px   | 16px      | --text-base  |
| lg   | 48px   | 24px      | --text-md    |

**Состояния:** default → hover (brightness+10%) → active (scale 0.97) → disabled (opacity 0.4, cursor: not-allowed) → loading (spinner внутри, pointer-events: none)

---

### 5.2 Card (Debut Card)

```
bg: --gray-850
border: 1px solid --gray-700
border-radius: --r-lg
padding: --sp-4
overflow: hidden

Hover (реализован):
  border-color: --gray-500
  transform: translateY(-2px)
  transition: 200ms ease
  /* Эффект уже есть в продакшне — не переписывать */
```

**Структура:**
1. `CardBoard` — превью доски (aspect-ratio: 1/1, покрывает верх карточки)
2. `CardBody` — padding --sp-4
3. `CardTitle` — --text-md, --weight-semibold, color: **--gray-50**
4. `CardDescription` — --text-sm, color: **--gray-200**, 2 строки с обрезкой
5. `CardFooter` — flex, space-between: badge + timestamp
   - `timestamp` — --text-xs, JetBrains Mono, color: **--gray-200** *(было --gray-400 — нечитаемо на коричневом фоне)*

---

### 5.3 Badge

```
height: 22px
padding: 0 --sp-2
border-radius: --r-sm
font: --text-xs, --weight-medium, font-family: JetBrains Mono

Варианты:
  moves    → bg: --color-accent-muted,  text: --color-accent   /* красный, как в продакшне */
  new      → bg: --color-gold-muted,    text: --color-gold
  success  → bg: --color-success-muted, text: --color-success
  neutral  → bg: --gray-800,            text: --gray-400
```

> **Примечание:** бейдж «N ходов» использует акцентный красный — это допустимое исключение из правила «один акцент», так как бейдж информационный, а не призыв к действию. Красная CTA-кнопка и красный бейдж не конкурируют — они в разных зонах внимания.

---

### 5.4 Input / Search

```
height: 40px
bg: --gray-800
border: 1px solid --gray-700
border-radius: --r-md
padding: 0 --sp-4
font: --text-base, Epilogue
color: --gray-50
placeholder: --gray-400

Focus:
  border-color: --gray-500
  outline: 2px solid --color-accent20
  outline-offset: 0
```

Иконка поиска — --gray-400, при фокусе — --gray-200.

---

### 5.5 Modal / Dialog

```
overlay: rgba(0,0,0,0.75), backdrop-filter: blur(4px)
panel:
  bg: --gray-850
  border: 1px solid --gray-700
  border-radius: --r-xl
  padding: --sp-8
  max-width: 480px
  animation: slideUp 200ms ease + fadeIn

Header: title --text-lg --weight-semibold + close-button (icon, top-right)
Body: --sp-6 gap между секциями
Footer: flex, gap --sp-3, кнопки выровнены вправо
```

---

### 5.6 Toggle / Switch

```
track: 44×24px, border-radius: --r-full
  OFF → bg: --gray-700
  ON  → bg: --color-accent
thumb: 20×20px, bg: white, border-radius: --r-full
  transition: transform 200ms ease
```

Состояние disabled: opacity 0.4.

---

### 5.7 Chess Board

```
Клетка: aspect-ratio 1/1
Light square: --board-light
Dark square:  --board-dark

Highlights (классы на td/div):
  .last-move  → bg: --board-highlight
  .hint       → ::after круг, bg: --board-hint, radius: 50%
  .error      → bg: --board-error, animation: shake 300ms

Координаты: --text-xs, JetBrains Mono
  Ранги (1–8)  — на тёмных клетках: --board-light, на светлых: --board-dark
  Файлы (a–h) — аналогично
```

Без внешних теней и border-radius — доска всегда прямоугольная.

---

### 5.8 Navigation Bar

```
height: 56px
bg: --gray-900
border-bottom: 1px solid --gray-800
padding: 0 --sp-6
position: sticky, top: 0
z-index: 100

Layout: [CTA] [CustomGame] | [Logo+Tagline] | [Search] [Add] [icons]
```

---

### 5.9 PGN Notation Display

```
font-family: JetBrains Mono
font-size: --text-sm
color: --gray-200

Move number: --gray-400, --weight-regular
White move:  --color-accent, --weight-medium
Black move:  --color-accent, --weight-regular
```

Current move:
  bg: --color-gold-muted
  color: --color-gold
  border-radius: --r-sm
  padding: 0 4px

Hover on move: bg: --gray-800, cursor: pointer
```

---

### 5.10 Toast / Notification

```
position: fixed, bottom: --sp-6, right: --sp-6
max-width: 360px
bg: --gray-850
border: 1px solid --gray-700
border-radius: --r-lg
padding: --sp-4 --sp-5
box-shadow: 0 8px 32px rgba(0,0,0,0.4)

Левый бордер (4px):
  success → --color-success
  error   → --color-error
  info    → --color-info

Анимация: slideInRight 250ms ease, auto-dismiss 4000ms
```

---

## 6. Принципы дизайна

### 1. Доска диктует сетку
Шахматная доска — восемь на восемь. Используй `8` и кратные ему значения для размеров и отступов. Карточки дебютов — всегда квадратные превью (1:1). Сетка коллекции — адаптивная (`auto-fill`, минимальная ширина карточки ~260px), реализована в продакшне.

### 2. Нотация — часть визуального языка
PGN и ходы рендерятся моноширинным шрифтом везде без исключений. Это не техническая деталь — это идентичность продукта. Пользователь должен читать `1.e4 e5 2.Nf3` так же легко, как читает слово.

### 3. Тёмная тема — единственная тема
Шахматы играют вечером, в сосредоточении. Светлая тема не предусматривается. Контраст текста к фону — минимум **7:1** (WCAG AAA) для основного текста (`--gray-50` = `#FFFFFF`), минимум **4.5:1** (WCAG AA) для вторичного (`--gray-200`, `--gray-400`).

### 4. Состояния важнее анимаций
Каждый интерактивный элемент имеет чёткие состояния: default, hover, active, disabled, loading, error. Анимации — только там, где они несут смысл (правильный/неверный ход, смена дебюта). Без декоративных spin-эффектов.

### 5. Акцент — один и точный
Красный (`#E8360A`) — только для главного действия на экране. Не больше одной красной кнопки в viewport одновременно. Золотой (`#C9922A`) — для шахматного контекста (ходы, позиции, «правильно»).

### 6. Плотность информации над пустым пространством
Карточки дебютов несут максимум данных при минимуме площади. Превью доски + название + описание + счётчик ходов + дата — всё это должно считываться за 2 секунды. Используй иерархию размеров, а не пустое пространство.

### 7. Моноширина как фирменный знак
Все числовые данные (количество ходов, дата, счётчики) рендерятся в JetBrains Mono. Это создаёт визуальную консистентность таблиц и списков без дополнительной вёрстки.

### 8. Микровзаимодействия — честные
Анимация правильного хода (`board-hint` → исчезновение) должна занимать ≤300ms. Анимация ошибки (shake) — ≤400ms. Переходы между дебютами — fade 150ms. Никаких «красивых» задержек — скорость обучения важнее эффектности.

### 9. Прогрессивное раскрытие
Настройки тренировки скрыты до клика «Старт». Редактирование карточки появляется по hover. PGN отображается по запросу. Интерфейс не перегружает новичка, но не скрывает возможности от опытного пользователя.

### 10. Консистентность символов
Используй единый набор иконок (Lucide или Phosphor — один вендор, не смешивать). Иконки в UI — только outline-стиль, 20×20px для navbar, 16×16px для inline. Шахматные фигуры — только SVG-спрайт в едином стиле (Merida или Cburnett).

---

## 7. CSS-переменные (итоговый список)

```css
:root {
  /* Акцент */
  --color-accent: #E8360A;
  --color-accent-hover: #FF4A1C;
  --color-accent-muted: rgba(232, 54, 10, 0.15);
  --color-gold: #C9922A;
  --color-gold-muted: rgba(201, 146, 42, 0.1);

  /* Нейтральная шкала — тема Эспрессо (Тёмный шоколад) */
  --gray-950: #0C0806;
  --gray-900: #140D0B;
  --gray-850: #1D1410;
  --gray-800: #281C16;
  --gray-700: #3D2B22;
  --gray-600: #543D32;
  --gray-400: #8C6B5A;
  --gray-200: #C9B3A8;
  --gray-50:  #F2EBE6;

  /* Семантика */
  --color-success: #22C55E;
  --color-success-muted: rgba(34, 197, 94, 0.1);
  --color-error: #E8360A;
  --color-error-muted: rgba(232, 54, 10, 0.15);
  --color-warning: #F59E0B;
  --color-info: #3B82F6;

  /* Доска */
  --board-light: #E8C89A;
  --board-dark: #A0714A;
  --board-highlight: rgba(246, 246, 105, 0.7);
  --board-hint: rgba(34, 197, 94, 0.4);
  --board-error: rgba(232, 54, 10, 0.4);

  /* Типографика */
  --font-display: 'Syne', sans-serif;
  --font-body: 'Epilogue', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs:   0.6875rem;  /* 11px */
  --text-sm:   0.8125rem;  /* 13px */
  --text-base: 0.9375rem;  /* 15px */
  --text-md:   1.0625rem;  /* 17px */
  --text-lg:   1.3125rem;  /* 21px */
  --text-xl:   1.6875rem;  /* 27px */
  --text-2xl:  2.25rem;    /* 36px */
  --text-3xl:  3.25rem;    /* 52px */

  --weight-regular:  400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;
  --weight-black:    900;

  --leading-tight:   1.1;
  --leading-snug:    1.3;
  --leading-normal:  1.5;
  --leading-relaxed: 1.7;

  /* Отступы */
  --sp-1:  4px;
  --sp-2:  8px;
  --sp-3:  12px;
  --sp-4:  16px;
  --sp-5:  20px;
  --sp-6:  24px;
  --sp-8:  32px;
  --sp-10: 40px;
  --sp-12: 48px;
  --sp-16: 64px;
  --sp-24: 96px;

  /* Радиусы */
  --r-sm:   4px;
  --r-md:   8px;
  --r-lg:   12px;
  --r-xl:   16px;
  --r-2xl:  24px;
  --r-full: 9999px;
}

/* ─── Светлая тема — Белый шоколад ─── */
[data-theme="light"] {
  /* Акцент (более насыщенный для контраста на светлом фоне) */
  --color-accent: #EA580C;
  --color-accent-hover: #C2410C;
  --color-accent-muted: rgba(234, 88, 12, 0.12);
  --color-gold: #A07520;
  --color-gold-muted: rgba(160, 117, 32, 0.12);

  /* Нейтральная шкала (инвертирована: 950=светлый фон, 50=тёмный текст) */
  --gray-950: #FDFBF7;
  --gray-900: #F5EBD7;
  --gray-850: #EBDDC8;
  --gray-800: #DBC4A8;
  --gray-700: #B89B7A;
  --gray-600: #8F7558;
  --gray-400: #5C4A35;
  --gray-200: #3A2E1E;
  --gray-50:  #1A100B;
}
```

---

*Версия 1.3 · Апрель 2026 · RandomChessDebut*

### Changelog

**v1.3** — добавлена светлая тема «Молочный шоколад»:
- Новая нейтральная шкала для `[data-theme="light"]` — бежево-коричневые тона (`#F5F0E8` … `#1C1208`)
- Принцип инверсии шкалы: 950 = самый светлый фон, 50 = самый тёмный текст
- Акцентные цвета светлой темы чуть приглушены (`#B8340F`, `#CC3D12`) для сохранения контраста на светлом фоне
- Нейтральная шкала полностью переработана: серые тона заменены на коричневые (950→50: `#0E0A08` … `#F0E6D8`)
- CSS-переменные `--gray-*` обновлены соответственно
- `CardTitle` — явно задан цвет `--gray-50`
- `CardDescription` — цвет повышен с `--gray-400` до `--gray-200` для читаемости
- `CardFooter timestamp` — цвет повышен с `--gray-400` до `--gray-200` (дата была нечитаема на коричневом фоне)
- `5.2 Card` — уточнено: hover-эффект уже реализован, не переписывать
- `5.3 Badge` — исправлен цвет бейджа «N ходов»: акцентный красный (не золотой), добавлено обоснование
- `5.8 Navbar` — убрана полупрозрачность при скролле (не нужна по решению продукта)
- `5.8 Navbar` — убран `backdrop-filter`
- `Принцип 1` — уточнено: адаптивная сетка уже реализована