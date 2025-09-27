

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface PostProfile {
  full_name: string | null;
  avatar_url: string | null;
}

export interface Like {
  user_id: string;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  profiles: PostProfile | null;
}

export interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  group_id: string | null;
  profiles: PostProfile | null;
  groups: { name: string } | null;
  likes: Like[];
  comments: [{ count: number }];
}

export interface Store {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  user_id: string;
  profiles: PostProfile | null;
}

export interface Product {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  store_id: string;
  user_id: string;
}

export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  content: string;
}

export interface Conversation {
  other_user_id: string;
  profile: Profile;
  last_message: Message;
}

export interface Group {
    id: string;
    created_at: string;
    name: string;
    description: string | null;
    user_id: string; // owner
    profiles: PostProfile | null; // owner profile
    group_members: [{ count: number }];
}

export interface GroupMember {
    id: string;
    user_id: string;
    group_id: string;
    profiles: PostProfile | null;
}

export interface GroupPost extends Post {
    group_id: string;
}

export type NotificationType = 'like_post' | 'comment_post' | 'new_message';

export interface Notification {
    id: string;
    created_at: string;
    user_id: string; // recipient
    actor_id: string; // the user who performed the action
    type: NotificationType;
    entity_id: string; // id of the post, message, etc.
    read: boolean;
    actors: PostProfile | null; // Profile of the actor
}