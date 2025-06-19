"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { getUserData, saveUserData } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import { Plus, ImageIcon, Type, Trash2, Edit } from "lucide-react"

export default function AddContentPage() {
  const [userData, setUserData] = useState(getUserData())
  const [isAdding, setIsAdding] = useState(false)
  const [contentType, setContentType] = useState<"image" | "text">("text")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    setUserData(getUserData())
  }, [])

  const handleAddContent = () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both title and content fields.",
        variant: "destructive",
      })
      return
    }

    const newContent = {
      id: Date.now().toString(),
      type: contentType,
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }

    const updatedContent = editingId
      ? userData.customContent.map((item) => (item.id === editingId ? { ...newContent, id: editingId } : item))
      : [...userData.customContent, newContent]

    const newUserData = { ...userData, customContent: updatedContent }
    setUserData(newUserData)
    saveUserData({ customContent: updatedContent })

    toast({
      title: editingId ? "Content Updated!" : "Content Added!",
      description: `Your ${contentType} has been ${editingId ? "updated" : "added"} successfully.`,
    })

    // Reset form
    setTitle("")
    setContent("")
    setIsAdding(false)
    setEditingId(null)
  }

  const handleEdit = (item: any) => {
    setTitle(item.title)
    setContent(item.content)
    setContentType(item.type)
    setEditingId(item.id)
    setIsAdding(true)
  }

  const handleDelete = (id: string) => {
    const updatedContent = userData.customContent.filter((item) => item.id !== id)
    const newUserData = { ...userData, customContent: updatedContent }
    setUserData(newUserData)
    saveUserData({ customContent: updatedContent })

    toast({
      title: "Content Deleted",
      description: "Your content has been removed successfully.",
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setContent(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Add Custom Content
          </h1>
          <p className="text-xl text-muted-foreground">Create your own images and text content for the game</p>
        </div>

        {/* Add Content Form */}
        <Card className="mb-8 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingId ? "Edit Content" : "Add New Content"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAdding ? (
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => {
                    setContentType("text")
                    setIsAdding(true)
                  }}
                  className="flex items-center gap-2"
                >
                  <Type className="w-4 h-4" />
                  Add Text
                </Button>
                <Button
                  onClick={() => {
                    setContentType("image")
                    setIsAdding(true)
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Add Image
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for your content"
                  />
                </div>

                {contentType === "text" ? (
                  <div>
                    <Label htmlFor="content">Text Content</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter your text content here..."
                      rows={4}
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="image">Image Upload</Label>
                    <Input id="image" type="file" accept="image/*" onChange={handleImageUpload} className="mb-2" />
                    {content && (
                      <div className="mt-2">
                        <img
                          src={content || "/placeholder.svg"}
                          alt="Preview"
                          className="max-w-full h-32 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleAddContent} className="flex-1">
                    {editingId ? "Update Content" : "Add Content"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false)
                      setEditingId(null)
                      setTitle("")
                      setContent("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Content List */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            Your Content ({userData.customContent.length})
          </h2>

          {userData.customContent.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold mb-2">No Content Yet</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first piece of custom content!</p>
                <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Content
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userData.customContent.map((item) => (
                <Card key={item.id} className="group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {item.type === "image" ? (
                            <ImageIcon className="w-3 h-3 mr-1" />
                          ) : (
                            <Type className="w-3 h-3 mr-1" />
                          )}
                          {item.type}
                        </Badge>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.type === "image" ? (
                      <img
                        src={item.content || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Added {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
