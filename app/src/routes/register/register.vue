<template>
	<public-view>
		<h1 class="type-title">Register</h1>

		<continue-as v-if="authenticated" />

		<register-form v-else :sso-error="ssoErrorCode" />

		<template v-if="authenticated" #notice>
			<v-icon name="lock_open" left />
			{{ $t('authenticated') }}
		</template>
		<template v-else #notice>
			<v-icon name="lock_outlined" left />
			{{
				logoutReason && $te(`logoutReason.${logoutReason}`)
					? $t(`logoutReason.${logoutReason}`)
					: $t('not_authenticated')
			}}
		</template>
	</public-view>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from '@vue/composition-api';
import RegisterForm from './components/register-form/';
import ContinueAs from './components/continue-as/';
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
	components: { RegisterForm, ContinueAs },
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
