'use client';

import { useState } from 'react';
import { Plus, X, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActivityItem } from '../types';
import { generateId } from '../types';

interface DayActivitiesSectionProps {
  activities: ActivityItem[];
  onChange: (activities: ActivityItem[]) => void;
}

export function DayActivitiesSection({ activities, onChange }: DayActivitiesSectionProps) {
  const [newName, setNewName] = useState('');

  const addActivity = () => {
    if (!newName.trim()) return;
    const activity: ActivityItem = {
      id: generateId(),
      name: newName.trim(),
      description: '',
    };
    onChange([...activities, activity]);
    setNewName('');
  };

  const removeActivity = (id: string) => {
    onChange(activities.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity
            className={cn(
              'h-4 w-4',
              activities.length > 0 ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <span className="text-sm font-medium">Activities</span>
          {activities.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {activities.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Activity list */}
      {activities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activities.map(act => (
            <div
              key={act.id}
              className="flex items-center gap-2 bg-muted/50 rounded-full pl-3 pr-1 py-1"
            >
              <span className="text-sm">{act.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-red-500"
                onClick={() => removeActivity(act.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add activity form */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Add activity..."
          className="h-9 text-sm flex-1"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addActivity())}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addActivity}
          className="h-9 gap-1"
          disabled={!newName.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
