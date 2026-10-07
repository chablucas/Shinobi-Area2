<script setup lang="ts">
import type { Category } from '../types/card'

defineProps<{
  categories: Category[]
  selected: Category | null
  disabled?: boolean
}>()

defineEmits<{
  select: [category: Category]
}>()
</script>

<template>
  <div class="category-selector">
    <button
      v-for="category in categories"
      :key="category.slug"
      type="button"
      class="category-button"
      :disabled="disabled"
      :class="{ selected: selected?.slug === category.slug }"
      @click="$emit('select', category)"
    >
      <span class="category-name">
        {{ category.label }}
      </span>

      <strong class="category-action">
        {{ selected?.slug === category.slug ? 'Choisie' : 'Choisir' }}
      </strong>
    </button>
  </div>
</template>

<style scoped src="./CategorySelector.css"></style>