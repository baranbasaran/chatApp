import { Request, Response } from 'express';
import { User } from '../models/User';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { userId: string }).userId;
    const users = await User.find({ _id: { $ne: userId } }).select('username avatar status');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Exclude the current user from search results
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        },
        { _id: { $ne: req.user._id } }, // Exclude current user
      ],
    })
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        },
        { _id: { $ne: req.user._id } },
      ],
    });

    res.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 