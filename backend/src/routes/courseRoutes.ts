import { Router } from 'express';
import { getAllCourses, getCourseById, recommendCourse } from '../controllers/courseController';

const router = Router();

router.get('/', getAllCourses);
router.post('/recommend', recommendCourse);
router.get('/:id', getCourseById);

export default router;
