<script setup lang="ts">
import QueryResults from './components/results/QueryResults.vue'

type WebviewView = 'queryResults'

function getWebviewView(): WebviewView {
  // const v = window.__VSCODE_WEBVIEW_VIEW__;
  // return v === 'test' ? 'test' : 'queryResults';
  return 'queryResults';
}

const view = getWebviewView()
</script>

<template>
  <QueryResults v-if="view === 'queryResults'" />
  <Test v-else />
</template>

<style scoped></style>
