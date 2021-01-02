<template>
	<public-view>
		<h1 class="type-title">Register</h1>

		<p style="margin-bottom: 16px">
			Registration was successful. Please check your email inbox to set up your password, confirm your email address and
			finish the registration.
		</p>

		<router-link to="/login" class="forgot-password">
			<v-button type="button" large>Go to Login page</v-button>
		</router-link>
	</public-view>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from '@vue/composition-api';
import { useAppStore } from '@/stores';

import { LogoutReason } from '@/auth';

export default defineComponent({
	props: {
		ssoErrorCode: {
			type: String,
			default: null,
		},
		logoutReason: {
			type: String as PropType<LogoutReason>,
			default: null,
		},
	},
	components: {},
	setup() {
		const appStore = useAppStore();

		const authenticated = computed(() => appStore.state.authenticated);

		return { authenticated };
	},
});
</script>

<style lang="scss" scoped>
h1 {
	margin-bottom: 20px;
}
</style>
