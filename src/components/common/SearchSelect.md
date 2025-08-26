# SearchSelect 搜索选择器组件

## 概述

`SearchSelect` 是一个功能强大的搜索选择器组件，支持实时搜索、单选/多选、自定义字段映射等功能。适用于需要从大量选项中快速查找和选择的场景。

## 特性

- 🔍 **实时搜索**：输入关键词时实时筛选选项
- 🎯 **智能匹配**：支持多字段搜索
- ✅ **单选/多选**：支持单选和多选模式
- 🎨 **自定义样式**：可自定义外观和交互
- 📱 **响应式设计**：适配不同屏幕尺寸
- ♿ **无障碍支持**：支持键盘导航和屏幕阅读器

## 基本用法

### 1. 基础选择器

```vue
<template>
  <SearchSelect
    v-model="selectedUser"
    :options="userList"
    placeholder="请选择用户"
    title="选择用户"
  />
</template>

<script setup>
import { ref } from 'vue';
import SearchSelect from '@/components/common/SearchSelect.vue';

const selectedUser = ref(null);
const userList = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' },
  { id: 3, name: '王五', email: 'wangwu@example.com' }
];
</script>
```

### 2. 自定义字段映射

```vue
<template>
  <SearchSelect
    v-model="selectedUser"
    :options="userList"
    option-key="id"
    option-label="name"
    :search-fields="['name', 'email']"
    placeholder="搜索用户名或邮箱"
  />
</template>
```

### 3. 多选模式

```vue
<template>
  <SearchSelect
    v-model="selectedUsers"
    :options="userList"
    :multiple="true"
    placeholder="选择多个用户"
    title="多选用户"
  />
</template>

<script setup>
const selectedUsers = ref([]); // 多选时使用数组
</script>
```

## Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `options` | `any[]` | `[]` | **必需**：选项列表 |
| `modelValue` | `any` | `undefined` | **必需**：当前选中的值 |
| `placeholder` | `string` | `'请选择...'` | 输入框占位符文本 |
| `title` | `string` | `'选择选项'` | 下拉框标题 |
| `noResultsText` | `string` | `'没有找到匹配的选项'` | 无结果时显示的文本 |
| `disabled` | `boolean` | `false` | 是否禁用组件 |
| `optionKey` | `string` | `'id'` | 选项的唯一标识字段名 |
| `optionLabel` | `string` | `'label'` | 选项的显示文本字段名 |
| `searchFields` | `string[]` | `['label']` | 搜索字段名数组 |
| `multiple` | `boolean` | `false` | 是否支持多选 |
| `maxOptions` | `number` | `100` | 最大显示选项数量 |

## Events 事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `update:modelValue` | `(value: any)` | 值变化时触发 |
| `select` | `(option: any)` | 选择选项时触发 |
| `search` | `(keyword: string)` | 搜索时触发 |

## 高级用法

### 1. 复杂数据结构

```vue
<template>
  <SearchSelect
    v-model="selectedProduct"
    :options="productList"
    option-key="sku"
    option-label="displayName"
    :search-fields="['name', 'category', 'brand']"
    placeholder="搜索产品名称、分类或品牌"
  />
</template>

<script setup>
const productList = [
  {
    sku: 'P001',
    name: 'iPhone 15 Pro',
    category: '手机',
    brand: 'Apple',
    displayName: 'iPhone 15 Pro - Apple'
  }
];
</script>
```

### 2. 异步数据加载

```vue
<template>
  <SearchSelect
    v-model="selectedUser"
    :options="filteredUsers"
    @search="handleSearch"
    placeholder="输入用户名搜索"
  />
</template>

<script setup>
import { ref } from 'vue';

const selectedUser = ref(null);
const filteredUsers = ref([]);

const handleSearch = async (keyword) => {
  if (keyword.length >= 2) {
    // 调用API搜索用户
    const users = await searchUsers(keyword);
    filteredUsers.value = users;
  }
};
</script>
```

### 3. 自定义样式

```vue
<template>
  <SearchSelect
    v-model="selectedOption"
    :options="options"
    class="custom-search-select"
  />
</template>

<style scoped>
.custom-search-select :deep(.search-select-input) {
  background-color: #f5f5f5;
  border-color: #ddd;
  color: #333;
}

.custom-search-select :deep(.search-dropdown) {
  background-color: #fff;
  border-color: #ddd;
}
</style>
```

## 数据结构要求

### 选项对象格式

```typescript
interface Option {
  id: string | number;        // 唯一标识
  label: string;              // 显示文本
  [key: string]: any;         // 其他自定义字段
}
```

### 多选模式

多选模式下，`modelValue` 应该是一个数组：

```typescript
// 单选
const selectedValue = ref<Option | null>(null);

// 多选
const selectedValues = ref<Option[]>([]);
```

## 样式定制

组件使用CSS变量和深度选择器，可以轻松定制样式：

```css
/* 自定义主题色 */
.search-select-container :deep(.search-select-input:focus) {
  border-color: #your-color;
  box-shadow: 0 0 0 2px rgba(your-color, 0.1);
}

/* 自定义下拉框样式 */
.search-select-container :deep(.search-dropdown) {
  background-color: #your-bg-color;
  border-color: #your-border-color;
}
```

## 注意事项

1. **性能优化**：当选项数量很大时，建议使用 `maxOptions` 限制显示数量
2. **搜索字段**：确保 `searchFields` 中的字段在选项对象中存在
3. **键盘导航**：支持 Tab 键导航和 Enter 键选择
4. **无障碍**：组件已添加适当的 ARIA 属性

## 完整示例

```vue
<template>
  <div class="user-selector">
    <h3>用户选择器</h3>
    
    <!-- 单选模式 -->
    <SearchSelect
      v-model="selectedUser"
      :options="userList"
      option-key="id"
      option-label="name"
      :search-fields="['name', 'email']"
      placeholder="搜索用户名或邮箱"
      title="选择用户"
      @select="handleUserSelect"
    />
    
    <!-- 多选模式 -->
    <SearchSelect
      v-model="selectedUsers"
      :options="userList"
      :multiple="true"
      placeholder="选择多个用户"
      title="多选用户"
      @select="handleUsersSelect"
    />
    
    <!-- 显示选中结果 -->
    <div class="results">
      <p>单选结果: {{ selectedUser?.name || '未选择' }}</p>
      <p>多选结果: {{ selectedUsers.map(u => u.name).join(', ') || '未选择' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SearchSelect from '@/components/common/SearchSelect.vue';

const selectedUser = ref(null);
const selectedUsers = ref([]);

const userList = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', role: '管理员' },
  { id: 2, name: '李四', email: 'lisi@example.com', role: '用户' },
  { id: 3, name: '王五', email: 'wangwu@example.com', role: '用户' }
];

const handleUserSelect = (user) => {
  console.log('选中用户:', user);
};

const handleUsersSelect = (user) => {
  console.log('多选用户:', user);
};
</script>

<style scoped>
.user-selector {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.results {
  margin-top: 20px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
}
</style>
```

## 更新日志

- **v1.0.0**: 初始版本，支持基础搜索选择功能
- **v1.1.0**: 添加多选模式支持
- **v1.2.0**: 优化性能和用户体验
- **v1.3.0**: 添加响应式设计和无障碍支持
