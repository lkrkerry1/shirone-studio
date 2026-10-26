<script lang="ts">
  let status = $state('M0 scaffold')
</script>

<main class="shell">
  <header class="topbar">
    <div class="brand">Shirone Studio</div>
    <div class="status">{status}</div>
  </header>
  <section class="empty">
    <h1>Shirone Studio</h1>
    <p>Plugin-driven editor for a Shirone site.</p>
    <p class="hint">M0 scaffold — Cordis kernel and content types arrive in the next milestones.</p>
  </section>
</main>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--surface-2);
  }

  .brand {
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .status {
    color: var(--muted);
    font-size: 12px;
  }

  .empty {
    display: grid;
    place-content: center;
    flex: 1;
    gap: 8px;
    text-align: center;
    padding: 48px;
  }

  h1 {
    margin: 0;
    font-size: 32px;
  }

  p {
    margin: 0;
    color: var(--muted);
  }

  .hint {
    margin-top: 12px;
    font-size: 13px;
  }
</style>
