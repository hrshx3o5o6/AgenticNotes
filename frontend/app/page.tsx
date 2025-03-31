"use client"

import { Card } from "@/components/ui/card"
import { Upload, FileQuestion, BookOpen, Newspaper, Brain, TrendingUp, Clock } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header with Welcome and Stats */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b">
            <div>
              <h1 className="text-4xl font-bold">Welcome back, Alex!</h1>
              <p className="text-muted-foreground mt-1">Ready to enhance your learning journey?</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Notes Uploaded</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">85%</p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 hover:scale-[1.02] transition-all cursor-pointer bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-blue-500/20">
                  <Upload className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-semibold">Upload Study Materials</h2>
                <p className="text-muted-foreground">Transform your notes into interactive study guides</p>
                <Link href='/upload'>
                <Button className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-500">Get Started</Button>
                </Link>
                
              </div>
            </Card>

            <Card className="p-6 hover:scale-[1.02] transition-all cursor-pointer bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-purple-500/20">
                  <Brain className="w-8 h-8 text-purple-500" />
                </div>
                <h2 className="text-xl font-semibold">AI Study Assistant</h2>
                <p className="text-muted-foreground">Get personalized learning recommendations</p>
                <Link href='/ai'>
                <Button className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-500">Explore</Button>
                </Link>
                
              </div>
            </Card>

            {/* <Card className="p-6 hover:scale-[1.02] transition-all cursor-pointer bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-green-500/20">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold">Performance Analytics</h2>
                <p className="text-muted-foreground">Track your learning progress</p>
                <Button className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-500">View Stats</Button>
              </div>
            </Card> */}
          </div>

          {/* Recent Activity and Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { icon: Upload, text: "Uploaded Physics Notes", time: "2 hours ago" },
                  { icon: FileQuestion, text: "Analyzed Math Question Paper", time: "5 hours ago" },
                  { icon: BookOpen, text: "Started CAT-II Preparation", time: "1 day ago" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-accent/50">
                    <activity.icon className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="font-medium">{activity.text}</p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Study Progress</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Physics</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Mathematics</span>
                    <span>60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Computer Science</span>
                    <span>90%</span>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>
              </div>
            </Card>
          </div>

          {/* News Section */}
          <Card className="p-6 bg-gradient-to-r from-accent to-accent/50">
            <div className="flex items-center gap-4 mb-4">
              <Newspaper className="w-8 h-8 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">VIT News & Updates</h2>
                <p className="text-muted-foreground">Stay informed about campus activities</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {[
                "CAT-II Schedule Released",
                "New AI Lab Opening Soon",
                "Academic Calendar Updates"
              ].map((news, i) => (
                <Card key={i} className="p-4 bg-background/50">
                  <p className="font-medium">{news}</p>
                  <p className="text-sm text-muted-foreground mt-1">2 hours ago</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}