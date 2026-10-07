<script setup lang="ts">
defineProps<{
  message: string
  detail: string
}>()
</script>

<template>
  <aside
    class="round-result"
    aria-live="polite"
  >
    <span class="round-result-kicker">
      <i aria-hidden="true"></i>
      Verdict du tour
    </span>

    <h2 class="round-result-title">
      {{ message }}
    </h2>

    <p class="round-result-detail">
      {{ detail }}
    </p>
  </aside>
</template>

<style scoped src="./RoundResult.css"></style>