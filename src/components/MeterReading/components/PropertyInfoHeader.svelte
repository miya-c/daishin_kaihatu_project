<script lang="ts">
  import { PROPERTY_NAME_UNSET, ROOM_NAME_UNSET } from '../../../constants/messages';

  interface Props {
    propertyName: string;
    roomName: string;
  }

  let { propertyName, roomName }: Props = $props();
</script>

<div class="property-info-card">
  <h2 class="property-name">{String(propertyName || PROPERTY_NAME_UNSET)}</h2>
  <p class="room-info">部屋: {String(roomName || ROOM_NAME_UNSET)}</p>
</div>
