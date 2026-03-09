import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Save } from 'lucide-react';

interface SettingRow {
  id: string;
  key: string;
  value: any;
  description: string | null;
}

export default function PlatformSettings() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  useEffect(() => {
    supabase.from('platform_settings').select('*').then(({ data }) => {
      if (data) {
        setSettings(data as SettingRow[]);
        const vals: Record<string, any> = {};
        data.forEach(s => { vals[s.key] = s.value; });
        setFormValues(vals);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    for (const setting of settings) {
      const newVal = formValues[setting.key];
      if (JSON.stringify(newVal) !== JSON.stringify(setting.value)) {
        await supabase.from('platform_settings')
          .update({ value: newVal, updated_by: user?.id })
          .eq('key', setting.key);
        
        if (user) {
          await supabase.from('audit_logs').insert({
            admin_id: user.id, action: 'update_setting', target_type: 'setting',
            details: { key: setting.key, old_value: setting.value, new_value: newVal }
          });
        }
      }
    }
    
    toast.success('Settings saved');
    setSaving(false);
  };

  const renderSettingInput = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <Switch
          checked={formValues[key] ?? value}
          onCheckedChange={v => setFormValues(prev => ({ ...prev, [key]: v }))}
        />
      );
    }
    if (typeof value === 'number') {
      return (
        <Input
          type="number"
          value={formValues[key] ?? value}
          onChange={e => setFormValues(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
          className="max-w-[200px]"
        />
      );
    }
    return (
      <Input
        value={String(formValues[key] ?? value)}
        onChange={e => setFormValues(prev => ({ ...prev, [key]: e.target.value }))}
        className="max-w-[300px]"
      />
    );
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading settings...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Platform Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.length === 0 ? (
          <p className="text-muted-foreground">No settings configured.</p>
        ) : (
          settings.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
              <div>
                <Label className="font-medium">{s.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
              </div>
              {renderSettingInput(s.key, s.value)}
            </div>
          ))
        )}
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
