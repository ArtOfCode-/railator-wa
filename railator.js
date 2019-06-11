const isObject = obj => obj === Object(obj);

Date.prototype.toZuluTimeString = function () {
  return `${this.getHours().toString().padStart(2, '0')}:${this.getMinutes().toString().padStart(2, '0')}`;
};

Date.prototype.toISODateString = function () {
  return `${this.getFullYear()}-${(this.getMonth() + 1).toString().padStart(2, '0')}-${this.getDate().toString().padStart(2, '0')}`;
};

Date.prototype.toISOStringWithTZ = function () {
  const tzo = this.getTimezoneOffset();
  return `${this.getFullYear()}-${(this.getMonth() + 1).toString().padStart(2, '0')}-${this.getDate().toString().padStart(2, '0')}T` +
    `${this.getHours().toString().padStart(2, '0')}:${this.getMinutes().toString().padStart(2, '0')}:${this.getSeconds().toString().padStart(2, '0')}` +
    `${tzo === 0 ? 'Z' : `${tzo < 0 ? '+' : '-'}${(Math.floor(Math.abs(tzo) / 60)).toString().padStart(2, '0')}:${(tzo % 60).toString().padStart(2, '0')}`}`;
};

document.addEventListener('DOMContentLoaded', async () => {
  window.vm = new Vue({
    el: '#app',
    data: {
      apiBase: 'http://localhost:3000',
      apiVersion: '2017-10-01',
      stations: [],
      reasons: [],
      searching: false,
      mode: '',
      stationsDidYouMean: [],
      station: {},
      headcode: [],
      service: null,
      serviceDetails: null,
      error: '',

      history: {
        maxFrames: 20,
        attributes: ['mode', 'stationsDidYouMean', 'station', 'headcode', 'service', 'serviceDetails'],
        store: [],
        storeFrame: () => {
          const frame = {};
          vm.history.attributes.forEach(a => { frame[a] = vm[a] });
          vm.history.store.push(frame);
          localStorage.railator_lastFrame = JSON.stringify(frame);
          if (vm.history.store.length > vm.history.maxFrames) {
            vm.history.store.shift();
          }
        },
        back: () => {
          // Pop first, because the top frame is the _current_ frame not the last.
          vm.history.store.pop();
          const lastFrame = vm.history.store[vm.history.store.length - 1];
          Object.keys(lastFrame).forEach(a => {
            vm[a] = lastFrame[a];
          });
        }
      }
    },
    methods: {
      previousSearch: () => localStorage.railator_lastSearch,

      whereLeftOff: () => localStorage.railator_lastFrame ? JSON.parse(localStorage.railator_lastFrame) : null,

      restoreWhereLeft: () => {
        const lastFrame = vm.whereLeftOff();
        Object.keys(lastFrame).forEach(a => {
          vm[a] = lastFrame[a];
        });
      },

      nrccSeverity: sev => {
        return ({ 'Minor': 'alert alert-info', 'Normal': 'alert alert-warning', 'Major': 'alert alert-danger' })[sev];
      },

      decodeEntities: str => he.decode(str),

      makeAPIRequest: async (method, params) => {
        const response = await fetch(`${vm.apiBase}/${method}?${$.param(params)}`);
        const data = await response.json();
        if (response.status === 400) {
          vm.error = data.error;
          vm.mode = 'error';
          return -1;
        }
        else {
          return data;
        }
      },

      goBackOne: () => {
        vm.history.back();
      },

      handleSearch: async () => {
        vm.searching = true;
        vm.mode = '';

        const search = $('#search').val();
        if (search.length === 3) {
          // CRS search
          await vm.handleCRSSearch(search);
        }
        else if (search.length === 4) {
          // Headcode search
          await vm.handleHeadcodeSearch(search);
        }
        else {
          // Typing a station name, most likely
          await vm.handleStationNameSearch(search);
        }

        localStorage.railator_lastSearch = search;
        vm.searching = false;
        vm.history.storeFrame();
      },

      handleStationNameSearch: async search => {
        if (vm.stations.length === 0) {
          const data = await vm.makeAPIRequest('GetStationList', { currentVersion: '2017-10-01' });
          if (data === -1) return;
          vm.stations = data.StationList.Station.map(x => ({name: x.content, crs: x.attr.crs}));
        }

        vm.stationsDidYouMean = vm.stations.filter(x => x.name.toLowerCase().indexOf(search.toLowerCase()) !== -1 || x.crs.indexOf(search) !== -1);
        vm.mode = 'stations-didyoumean';
      },

      autoSearch: search => {
        $('#search').val(search);
        $('#search-submit').click();
      },

      autoSearchFromStorage: () => {
        vm.autoSearch(localStorage.railator_lastSearch);
      },

      handleCRSSearch: async search => {
        const arrivals = await vm.makeAPIRequest('GetArrivalBoardByCRS', { numRows: 10, crs: search.toUpperCase(), time: new Date().toISOStringWithTZ(), timeWindow: 60 });
        const departures = await vm.makeAPIRequest('GetDepartureBoardByCRS', { numRows: 10, crs: search.toUpperCase(), time: new Date().toISOStringWithTZ(), timeWindow: 60 });
        if (arrivals === -1 || departures === -1) return;

        vm.station = {
          name: arrivals.locationName,
          crs: arrivals.crs,
          manager: arrivals.stationManager,
          nrcc: !arrivals.nrccMessages ? [] :
                 arrivals.nrccMessages.message instanceof Array ? arrivals.nrccMessages.message : [arrivals.nrccMessages.message],
          arr: !arrivals.trainServices ? [] :
                arrivals.trainServices.service instanceof Array ? arrivals.trainServices.service : [arrivals.trainServices.service],
          dep: !departures.trainServices ? [] :
                departures.trainServices.service instanceof Array ? departures.trainServices.service : [departures.trainServices.service],
        };

        vm.mode = 'station';
      },

      handleHeadcodeSearch: async search => {
        const data = await vm.makeAPIRequest('QueryServices', { serviceID: search.toUpperCase(), sdd: new Date().toISODateString() });
        if (data === -1) return;
        vm.headcode = !data.serviceList ? [] :
                       data.serviceList.service instanceof Array ? data.serviceList.service : [data.serviceList.service];
        vm.mode = 'headcode';
      },

      serviceMode: async service => {
        vm.service = service;
        const data = await vm.makeAPIRequest('GetServiceDetailsByRID', { rid: isObject(service) ? service.rid : service });
        if (data === -1) return;

        data.origin = data.locations.location[0];
        data.destination = data.locations.location[data.locations.location.length - 1];
        data.stations = data.locations.location.length ? data.locations.location.filter(x => !!x.crs && !x.isPass) : [];

        vm.serviceDetails = data;

        vm.mode = 'service';
        vm.history.storeFrame();
      },

      getReason: (type, code) => {
        const filtered = vm.reasons.filter(r => r.code === code);
        if (type === 'delay') {
          return filtered.length > 0 ? filtered[0].lateReason : 'This train is delayed. Check information boards at stations for further information';
        }
        else if (type === 'cancel') {
          return filtered.length > 0 ? filtered[0].cancReason : 'This train has been cancelled. Check information boards at stations for further informationm';
        }
      }
    }
  });

  const reasonsData = await vm.makeAPIRequest('GetReasonCodeList');
  if (reasonsData === -1) {
    console.warn('Reason codes unavailable because of a SOAP fault');
  }
  else {
    vm.reasons = reasonsData.reason;
  }

  if (location.hash) {
    const parts = location.hash.split('-');
    if (parts.length < 2) return;
    const mode = parts[0];
    const id = parts[1];

    if (mode === '#station') {
      vm.autoSearch(id);
    }
    else if (mode === '#service') {
      vm.serviceMode(id);
    }
  }
});