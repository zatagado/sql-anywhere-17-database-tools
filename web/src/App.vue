<script setup lang="ts">
import DatabaseSearch from './components/search/DatabaseSearch.vue'
import ObjectDetails from './components/info/ObjectDetails.vue'
import QueryResults from './components/results/QueryResults.vue'

type WebviewView = 'databaseSearch' | 'queryResults' | 'objectDetails'

function getWebviewView(): WebviewView {
  switch (window.__VSCODE_WEBVIEW_VIEW__) {
    case 'objectDetails':
      return 'objectDetails';
    case 'queryResults':
      return 'queryResults';
    case 'databaseSearch':
      return 'databaseSearch';
    default:
      throw new Error("Window must be a WebviewView type.");
  }
}

const view = getWebviewView()
</script>

<template>
  <DatabaseSearch v-if="view === 'databaseSearch'" />
  <ObjectDetails v-else-if="view === 'objectDetails'" />
  <QueryResults v-else-if="view === 'queryResults'" />
</template>

<style scoped></style>
