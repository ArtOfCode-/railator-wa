if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/railator-sw.js');
    console.log('Registered ServiceWorker', reg);
  });
}

Array.prototype.zip = function (b) {
  return Object.fromEntries(this.map((x, i) => [x, b[i]]));
};

document.addEventListener('DOMContentLoaded', () => {
  window.vm = new Vue({
    el: '#app',
    data: {
      apiBase: 'http://localhost:3000/',
      stations: null,
      stationLookup: null,
      lines: null,
      loading: true,
      routeSelected: false,
      from: null,
      to: null,
      saved: []
    },
    methods: {
      jsonRequest: async path => {
        const resp = await fetch(`${vm.apiBase}${path}`);
        const data = await resp.json();
        return data;
      },

      setupData: async () => {
        vm.stations = await vm.jsonRequest('-/stations');
        vm.lines = await vm.jsonRequest('-/lines');
        vm.stationLookup = Object.values(vm.stations).zip(Object.keys(vm.stations));
        vm.saved = vm.getSavedRoutes();
        vm.loading = false;
      },

      getSavedRoutes: () => {
        return JSON.parse(localStorage.railator_savedPathfinderRoutes || '[]');
      },

      persistSavedRoutes: () => {
        localStorage.railator_savedPathfinderRoutes = JSON.stringify(vm.saved);
      },

      addSavedRoute: (from, to) => {
        vm.saved.push([from, to]);
        vm.persistSavedRoutes();
      },

      removeSavedRoute: (from, to) => {
        const idx = vm.saved.indexOf([from, to]);
        vm.saved.splice(idx, 1);
        vm.persistSavedRoutes();
      }
    }
  });

  vm.setupData();

  $('.select2').select2({

  });
});
