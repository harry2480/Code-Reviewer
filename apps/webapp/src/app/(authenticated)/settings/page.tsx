import { settingsLoader } from '@/backend/presentation/loaders/settings.loader';
import { SettingsContent } from '@/frontend/features/settings/components/settings-content';

export default async function SettingsPage() {
	const data = await settingsLoader();
	return <SettingsContent data={data} />;
}
