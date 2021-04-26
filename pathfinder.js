if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/railator-sw.js');
    console.log('Registered ServiceWorker', reg);
  });
}

Array.prototype.zip = function (b) {
  return Object.fromEntries(this.map((x, i) => [x, b[i]]));
};

const randomId = () => Math.floor(Math.random() * 1048576).toString(16);

document.addEventListener('DOMContentLoaded', async () => {
  window.vm = new Vue({
    el: '#app',
    data: {
      apiBase: 'http://localhost:3000/',
      stations: null,
      stationLookup: null,
      lines: null,
      loading: true,
      routeSelected: false,
      routeData: null,
      from: null,
      to: null,
      saved: [],
      disruptions: [],
      activeDisruptions: []
    },
    methods: {
      jsonRequest: async path => {
        const resp = await fetch(`${vm.apiBase}${path}`);
        const data = await resp.json();
        return data;
      },

      setupData: async () => {
        vm.stations = await vm.jsonRequest('pathfinder/stations');
        vm.lines = await vm.jsonRequest('pathfinder/lines');
        vm.stationLookup = Object.values(vm.stations).zip(Object.keys(vm.stations));
        vm.lineLookup = Object.values(vm.lines).zip(Object.keys(vm.lines));
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
      },

      saveRoute: () => {
        const from = $('#from').val();
        const to = $('#to').val();
        if (from && to) {
          vm.addSavedRoute(from, to);
        }
      },

      findRouteFromSearch: () => {
        const from = $('#from').val();
        const to = $('#to').val();
        if (from && to) {
          vm.findRoute(from, to);
        }
      },

      findRoute: async (from, to) => {
        vm.from = from;
        vm.to = to;
        vm.routeData = await vm.jsonRequest(`pathfinder/?from=${from}&to=${to}`);
        vm.disruptions = await vm.jsonRequest('tfl/Disruption');
        vm.activeDisruptions = Object.fromEntries(Object.keys(vm.routeData.stations).map(lk => {
          const lineStops = vm.routeData.stations[lk];
          return [lk, vm.disruptions.filter(d => lineStops.some(ls => d.atcoCode === ls || d.stationAtcoCode === ls))
                                    .map(d => { d.id = randomId(); return d; })];
        }));
        vm.changeMode(true);
      },

      changeMode: selected => {
        if (selected) {
          $('#from').select2('destroy');
          $('#to').select2('destroy');
        }
        vm.routeSelected = selected;
        if (!selected) {
          setTimeout(() => {
            $('.select2').select2();
          }, 0);
        }
      },

      alertClass: type => {
        const types = {
          'Information': 'alert-info',
          'Interchange Message': 'alert-info',
          'Part Closure': 'alert-warning',
          'Closure': 'alert-danger'
        };
        return types[type] || 'alert-info';
      }
    }
  });

  $('.select2').select2();

  await vm.setupData();

  if (location.hash) {
    const splat = location.hash.replace('#', '').split('/').map(c => decodeURIComponent(c));
    if (splat.length == 2) {
      vm.findRoute(splat[0], splat[1]);
    }
  }
});
