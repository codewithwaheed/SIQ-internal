import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Phone,
  MessageSquare,
  Globe,
  CheckCircle,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { format, addDays, setHours, setMinutes, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TimeSlot {
  time: string;
  available: boolean;
  consultant?: string;
}

interface LiveConsultationSchedulerProps {
  escalationId?: string;
  consultantId?: string;
  onScheduled?: (meeting: any) => void;
  className?: string;
}

export function LiveConsultationScheduler({
  escalationId,
  consultantId,
  onScheduled,
  className,
}: LiveConsultationSchedulerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'type' | 'time' | 'details' | 'confirmation'>('type');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [meetingData, setMeetingData] = useState({
    type: 'video' as 'video' | 'audio' | 'screen_share',
    duration: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    agenda: '',
    preparation_notes: '',
  });
  const [scheduledMeeting, setScheduledMeeting] = useState<any>(null);

  // Generate time slots for the selected date
  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots(selectedDate);
    }
  }, [selectedDate]);

  const generateTimeSlots = async (date: Date) => {
    setLoading(true);
    try {
      // Generate slots from 9 AM to 5 PM in 30-minute intervals
      const slots: TimeSlot[] = [];
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute of [0, 30]) {
          if (hour === 17 && minute === 30) break; // Don't go past 5 PM

          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotDate = setMinutes(setHours(date, hour), minute);

          // Don't show past time slots for today
          const isAvailable = !isBefore(slotDate, new Date());

          slots.push({
            time: timeString,
            available: isAvailable,
            consultant: isAvailable ? 'Available' : undefined,
          });
        }
      }

      // In a real implementation, you'd check consultant availability here
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const meetingDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      meetingDateTime.setHours(hours, minutes, 0, 0);

      const meetingPayload = {
        escalation_id: escalationId,
        consultant_id: consultantId,
        user_id: user?.id,
        meeting_type: meetingData.type,
        scheduled_at: meetingDateTime.toISOString(),
        duration_minutes: meetingData.duration,
        timezone: meetingData.timezone,
        agenda: meetingData.agenda,
        preparation_notes: meetingData.preparation_notes,
        status: 'scheduled',
      };

      const { data, error } = await supabase.functions.invoke('schedule-consultation', {
        body: meetingPayload,
      });

      if (error) throw error;

      setScheduledMeeting(data.meeting);
      setStep('confirmation');
      onScheduled?.(data.meeting);

      toast({
        title: 'Meeting scheduled',
        description: `Your consultation is scheduled for ${format(meetingDateTime, 'MMM d, yyyy at h:mm a')}`,
      });
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule meeting. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyMeetingLink = () => {
    if (scheduledMeeting?.meeting_url) {
      navigator.clipboard.writeText(scheduledMeeting.meeting_url);
      toast({
        title: 'Link copied',
        description: 'Meeting link copied to clipboard',
      });
    }
  };

  if (step === 'confirmation' && scheduledMeeting) {
    return (
      <Card className={cn('border-green-200 bg-green-50/50', className)}>
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-600" />
          <CardTitle className="text-green-800">Meeting Scheduled!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Date & Time</span>
              <span className="text-sm">
                {format(new Date(scheduledMeeting.scheduled_at), 'MMM d, yyyy at h:mm a')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Duration</span>
              <span className="text-sm">{scheduledMeeting.duration_minutes} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Type</span>
              <Badge variant="secondary">
                {scheduledMeeting.meeting_type === 'video' && <Video className="mr-1 h-3 w-3" />}
                {scheduledMeeting.meeting_type === 'audio' && <Phone className="mr-1 h-3 w-3" />}
                {scheduledMeeting.meeting_type === 'screen_share' && (
                  <MessageSquare className="mr-1 h-3 w-3" />
                )}
                {scheduledMeeting.meeting_type}
              </Badge>
            </div>
          </div>

          {scheduledMeeting.meeting_url && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Meeting Link</Label>
              <div className="flex items-center gap-2">
                <Input value={scheduledMeeting.meeting_url} readOnly className="bg-muted text-xs" />
                <Button size="sm" variant="outline" onClick={copyMeetingLink}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <h4 className="mb-1 text-sm font-medium text-blue-800">Before the meeting:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Check your camera and microphone</li>
              <li>• Prepare any specific questions</li>
              <li>• Review the escalation details</li>
              <li>• Join 5 minutes early</li>
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="flex-1"
              onClick={() => window.open(scheduledMeeting.meeting_url, '_blank')}
              disabled={!scheduledMeeting.meeting_url}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Join Meeting
            </Button>
            <Button variant="outline" onClick={() => setStep('type')}>
              Schedule Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Schedule Live Consultation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'type' && (
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block text-sm font-medium">Meeting Type</Label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    value: 'video',
                    label: 'Video Call',
                    icon: Video,
                    desc: 'Face-to-face discussion',
                  },
                  {
                    value: 'audio',
                    label: 'Audio Only',
                    icon: Phone,
                    desc: 'Voice call (low bandwidth)',
                  },
                  {
                    value: 'screen_share',
                    label: 'Screen Share',
                    icon: MessageSquare,
                    desc: 'Review documents together',
                  },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={meetingData.type === option.value ? 'default' : 'outline'}
                    className="h-auto justify-start p-4"
                    onClick={() =>
                      setMeetingData((prev) => ({
                        ...prev,
                        type: option.value as any,
                      }))
                    }
                  >
                    <option.icon className="mr-3 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.desc}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={meetingData.duration.toString()}
                onValueChange={(value) =>
                  setMeetingData((prev) => ({
                    ...prev,
                    duration: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setStep('time')} className="w-full">
              Choose Date & Time
            </Button>
          </div>
        )}

        {step === 'time' && (
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block text-sm font-medium">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) =>
                  isBefore(date, new Date()) ||
                  isAfter(date, addDays(new Date(), 30)) ||
                  date.getDay() === 0 ||
                  date.getDay() === 6
                }
                className="rounded-md border"
              />
            </div>

            {selectedDate && (
              <div>
                <Label className="mb-3 block text-sm font-medium">Available Times</Label>
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? 'default' : 'outline'}
                      size="sm"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className="text-xs"
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('type')}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep('details')}
                disabled={!selectedDate || !selectedTime}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="mb-1 text-sm font-medium">Meeting Summary</div>
              <div className="text-sm text-muted-foreground">
                {format(selectedDate!, 'MMM d, yyyy')} at {selectedTime} ({meetingData.duration}{' '}
                min)
              </div>
            </div>

            <div>
              <Label htmlFor="agenda">Meeting Agenda (Optional)</Label>
              <Textarea
                id="agenda"
                placeholder="What would you like to discuss? e.g., Security audit review, compliance questions..."
                value={meetingData.agenda}
                onChange={(e) =>
                  setMeetingData((prev) => ({
                    ...prev,
                    agenda: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="preparation">Preparation Notes (Optional)</Label>
              <Textarea
                id="preparation"
                placeholder="Any specific documents or information the consultant should prepare?"
                value={meetingData.preparation_notes}
                onChange={(e) =>
                  setMeetingData((prev) => ({
                    ...prev,
                    preparation_notes: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep('time')}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleScheduleMeeting} disabled={loading}>
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                ) : (
                  'Schedule Meeting'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
