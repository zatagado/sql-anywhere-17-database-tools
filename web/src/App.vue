<script setup lang="ts">
import QueryResults from './components/results/QueryResults.vue'
import Test from './components/results/Test.vue'

type WebviewView = 'queryResults' | 'test'

function getWebviewView(): WebviewView {
  const v = window.__VSCODE_WEBVIEW_VIEW__
  return v === 'test' ? 'test' : 'queryResults'
}

const view = getWebviewView()
</script>

<template>
  <QueryResults v-if="view === 'queryResults'" />
  <Test v-else />
</template>

<style scoped></style>
