<script setup lang="ts">
import ObjectDetails from './components/info/ObjectDetails.vue'
import QueryResults from './components/results/QueryResults.vue'

type WebviewView = 'queryResults' | 'objectDetails'

function getWebviewView(): WebviewView {
  const v = window.__VSCODE_WEBVIEW_VIEW__;
  return v === 'objectDetails' ? 'objectDetails' : 'queryResults';
}

const view = getWebviewView()
</script>

<template>
  <ObjectDetails v-if="view === 'objectDetails'" />
  <QueryResults v-else-if="view === 'queryResults'" />
</template>

<style scoped></style>
