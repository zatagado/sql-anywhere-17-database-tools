<template>
    <div class="loading-container">
        <div class="loading-spinner" />
    </div>
</template>

<style scoped>
.loading-container {
    position: fixed;
    inset: 0;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 1rem;
}

.loading-spinner {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    background-color: var(--vscode-foreground);
    mask-image: url('../../../resources/loading.svg');
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: contain;
    animation: loading-spin 0.9s linear infinite;
}

@keyframes loading-spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>