Vue.component('departure-link', {
  props: ['service'],
  template: `<a href="#" v-on:click="$emit('service-mode', service)" v-bind:class="service.isCancelled ? 'cancelled text-muted' : ''">
      <span v-if="service.departureType === 'Delayed'" class="text-danger">
          <i class="fas fa-clock"></i>
          <s>{{ new Date(service.std).toZuluTimeString() }}</s>
          <span v-if="service.etd && service.etd !== service.std">{{ new Date(service.etd).toZuluTimeString() }}</span>
      </span>
      <span v-if="service.departureType === 'Actual'" v-bind:class="service.lateness > 0 ? 'text-danger' : ''">
          <span v-if="service.lateness > 0">
              <i class="fas fa-clock"></i>
              <s>{{ new Date(service.std).toZuluTimeString() }}</s>
              <span v-if="service.atd">{{ new Date(service.atd).toZuluTimeString() }}</span>
          </span>
          <span v-if="!service.lateness || service.lateness <= 0">
              {{ new Date(service.std).toZuluTimeString() }}
          </span>
      </span>
      <span v-if="service.departureType === 'Forecast'" v-bind:class="!!service.etd && (new Date(service.etd).getTime() - new Date(service.std).getTime()) >= 60000 ? 'text-danger' : ''">
          <span v-if="!!service.etd && (new Date(service.etd).getTime() - new Date(service.std).getTime()) >= 60000">
              <i class="fas fa-clock"></i>
              <s>{{ new Date(service.std).toZuluTimeString() }}</s>
              <span v-if="service.etd && service.etd !== service.std">{{ new Date(service.etd).toZuluTimeString() }}</span>
          </span>
          <span v-if="!service.etd || (new Date(service.etd).getTime() - new Date(service.std).getTime()) < 60000">
              {{ new Date(service.std).toZuluTimeString() }}
          </span>
      </span>
      {{ service.trainid }} <small>to</small>
      <span v-html="service.destination.location.locationName"></span>
      <small class="text-muted" v-if="!!service['platform']">
          <span v-if="!service.platformIsHidden">plat {{ service.platform }}</span>
          <span v-if="service.platformIsHidden" title="preliminary, subject to change">plat {{ service.platform }}&dagger;</span>
      </small>
  </a>`
});