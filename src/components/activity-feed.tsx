
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gift, Zap } from 'lucide-react';

const activities = [
  {
    icon: <Users className="w-5 h-5 text-primary" />,
    description: "User 'Alpha' invited 3 new members.",
    time: "5m ago"
  },
  {
    icon: <Gift className="w-5 h-5 text-green-500" />,
    description: "User 'Bravo' claimed a daily reward.",
    time: "15m ago"
  },
  {
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    description: "User 'Charlie' started a forging session.",
    time: "30m ago"
  },
  {
    icon: <Users className="w-5 h-5 text-primary" />,
    description: "User 'Delta' invited a new member.",
    time: "1h ago"
  },
   {
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    description: "User 'Echo' completed a forging session.",
    time: "2h ago"
  }
]

const ActivityFeed = () => (
  <Card className="w-full max-w-sm bg-card/50 backdrop-blur-sm border-primary/10 shadow-lg rounded-xl">
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-primary/90">Recent Activity</CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="space-y-4">
        {activities.map((activity, index) => (
          <li key={index} className="flex items-center space-x-4 animate-fade-in">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{activity.description}</p>
            </div>
            <p className="text-xs text-muted-foreground">{activity.time}</p>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
)

export default ActivityFeed;
