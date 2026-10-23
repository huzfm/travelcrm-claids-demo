'use client';

import { useState } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Lead } from '@/types';
import { roleLabel } from '@/lib/permissions';

interface LeadEditFormProps {
  lead: Lead;
  isAdmin: boolean;
  isManager: boolean;
  users: Array<{ id: string; name: string; role?: string }>;
  branches?: Array<{ id: string; name: string }>;
  editState: {
    name: string;
    phone: string;
    email: string;
    source: string;
    status: string;
    assignedTo: string;
    notes: string;
    score: string;
    qualification: string;
    travelDateFrom: string;
    travelDateTo: string;
    destination: string;
    numberOfPax: string;
    budget: string;
    tripType: string;
    hotelCategory: string;
    customHotelCategory: string;
    pickupPoint: string;
    childrenCount: string;
    priority: string;
    branchId: string;
  };
  onChange: {
    setName: (v: string) => void;
    setPhone: (v: string) => void;
    setEmail: (v: string) => void;
    setSource: (v: string) => void;
    setStatus: (v: string) => void;
    setAssignedTo: (v: string) => void;
    setNotes: (v: string) => void;
    setScore: (v: string) => void;
    setQualification: (v: string) => void;
    setTravelDateFrom: (v: string) => void;
    setTravelDateTo: (v: string) => void;
    setDestination: (v: string) => void;
    setNumberOfPax: (v: string) => void;
    setBudget: (v: string) => void;
    setTripType: (v: string) => void;
    setHotelCategory: (v: string) => void;
    setCustomHotelCategory: (v: string) => void;
    setPickupPoint: (v: string) => void;
    setChildrenCount: (v: string) => void;
    setPriority: (v: string) => void;
    setBranchId: (v: string) => void;
  };
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function LeadEditForm({
  isAdmin,
  isManager,
  users,
  branches = [],
  editState,
  onChange,
  onSave,
  onCancel,
  isPending,
}: LeadEditFormProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [showInternal, setShowInternal] = useState(false);

  const sourceOptions = [
    { value: 'WEBSITE', label: 'Website' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'WALKIN', label: 'Walk-in' },
    { value: 'SOCIAL', label: 'Social Media' },
    { value: 'META_ADS', label: 'Meta Ads' },
    { value: 'GOOGLE_ADS', label: 'Google Ads' },
    { value: 'BULK_IMPORT', label: 'Bulk Import' },
  ];

  const tripTypeOptions = [
    { value: 'DOMESTIC', label: 'Domestic' },
    { value: 'INTERNATIONAL', label: 'International' },
  ];

  const hotelCategoryOptions = [
    { value: 'BUDGET', label: 'Budget' },
    { value: 'STANDARD', label: 'Standard' },
    { value: 'PREMIUM', label: 'Premium' },
    { value: 'LUXURY', label: 'Luxury' },
    { value: 'CUSTOM', label: 'Custom' },
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  return (
    <Card className="border-l-4 border-l-primary overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">Edit Lead</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-4">
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-5"
        >
          {/* Lead Information Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lead Information
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">Name *</Label>
                <Input value={editState.name} onChange={e => onChange.setName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">Phone *</Label>
                <PhoneInput value={editState.phone} onChange={onChange.setPhone} required />
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">
                  Destination Interested
                </Label>
                <Input
                  value={editState.destination}
                  onChange={e => onChange.setDestination(e.target.value)}
                  placeholder="Dubai, Maldives, Shimla..."
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">
                  Number of Persons / Pax
                </Label>
                <Input
                  value={editState.numberOfPax}
                  onChange={e => onChange.setNumberOfPax(e.target.value)}
                  placeholder="e.g. 2 adults, 1 adult 2 kids"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">
                  Travel Date From
                </Label>
                <Input
                  type="date"
                  value={editState.travelDateFrom}
                  onChange={e => onChange.setTravelDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">Travel Date To</Label>
                <Input
                  type="date"
                  value={editState.travelDateTo}
                  onChange={e => onChange.setTravelDateTo(e.target.value)}
                />
              </div>
            </div>
            {(isAdmin || isManager) && (
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">Lead Source</Label>
                <Select value={editState.source} onValueChange={onChange.setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="border-t" />

          {/* Additional Details - Collapsible */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowOptional(v => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Additional Details
                </h3>
                <p className="text-xs text-muted-foreground/60">More information about this lead</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="text-xs">{showOptional ? 'Hide' : 'Show'}</span>
                {showOptional ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </div>
            </button>

            {showOptional && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs sm:text-sm font-medium mb-1 block">Email</Label>
                  <Input
                    type="email"
                    value={editState.email}
                    onChange={e => onChange.setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium mb-1 block">Budget</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editState.budget}
                    onChange={e => onChange.setBudget(e.target.value)}
                    placeholder="5,000"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium mb-1 block">Trip Type</Label>
                  <Select value={editState.tripType} onValueChange={onChange.setTripType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {tripTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium mb-1 block">
                    Hotel Category
                  </Label>
                  <Select
                    value={editState.hotelCategory || ''}
                    onValueChange={v => onChange.setHotelCategory(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {hotelCategoryOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editState.hotelCategory === 'CUSTOM' && (
                    <Input
                      className="mt-1.5"
                      placeholder="Enter custom hotel category"
                      value={editState.customHotelCategory}
                      onChange={e => onChange.setCustomHotelCategory(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium mb-1 block">Pickup Point</Label>
                  <Input
                    value={editState.pickupPoint}
                    onChange={e => onChange.setPickupPoint(e.target.value)}
                    placeholder="Airport, Hotel, Home address..."
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium mb-1 block">
                    Children Count
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={editState.childrenCount}
                    onChange={e => onChange.setChildrenCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs sm:text-sm font-medium mb-1 block">Notes</Label>
                  <Textarea
                    value={editState.notes || ''}
                    onChange={e => onChange.setNotes(e.target.value)}
                    placeholder="Any additional notes about this lead..."
                    className="min-h-20 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Assignment & Priority - Admin/Manager only */}
          {(isAdmin || isManager) && (
            <>
              <div className="border-t" />
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowInternal(v => !v)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Assignment & Priority
                    </h3>
                    <p className="text-xs text-muted-foreground/60">Internal use only</p>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-xs">{showInternal ? 'Hide' : 'Show'}</span>
                    {showInternal ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                </button>

                {showInternal && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {isAdmin && (
                      <div>
                        <Label className="text-xs sm:text-sm font-medium mb-1 block">Branch</Label>
                        <Select
                          value={editState.branchId || ''}
                          onValueChange={onChange.setBranchId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs sm:text-sm font-medium mb-1 block">
                        Assigned Staff
                      </Label>
                      <Select
                        value={editState.assignedTo || ''}
                        onValueChange={onChange.setAssignedTo}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                              {isAdmin && ` (${roleLabel(u.role)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium mb-1 block">Priority</Label>
                      <Select value={editState.priority} onValueChange={onChange.setPriority}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Status & Qualification */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">Status</Label>
                <Select value={editState.status} onValueChange={onChange.setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'FRESH',
                      'FOLLOWUP',
                      'HOT',
                      'WARM',
                      'NOT_ANSWERING',
                      'WON',
                      'NOT_INTERESTED',
                      'JUNK',
                      'SENT_VOICEMAIL',
                      'CALL_DECLINED',
                      'CALL_BACK_SCHEDULED',
                      'CONNECTED',
                      'CLOSED',
                    ].map(s => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">Qualification</Label>
                <Select
                  value={editState.qualification || 'none'}
                  onValueChange={v => onChange.setQualification(v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="HOT">Hot Lead</SelectItem>
                    <SelectItem value="WARM">Warm Lead</SelectItem>
                    <SelectItem value="COLD">Cold Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 block">Score (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editState.score}
                  onChange={e => onChange.setScore(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={isPending}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
