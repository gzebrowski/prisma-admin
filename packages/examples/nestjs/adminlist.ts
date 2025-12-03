import { UserAdmin } from "./models/user";
import { CategoryAdmin  } from "./models/category";
import { PollAdmin } from "./models/poll";
import { PollAnswerAdmin } from "./models/pollanswer";
import { PollOptionAdmin } from "./models/polloption";
import { PollQuestionAdmin } from "./models/pollquestion";
import { PollResponseAdmin } from "./models/pollresponse";
import { PostAdmin } from "./models/post";
import { ProjectAdmin } from "./models/project";
import { ProjectCategoryAdmin } from "./models/projectcategory";
import { ProjectSubCategoryAdmin } from "./models/projectsubcategory";
import { TimeTrackingAdmin } from "./models/timetracking";

import { AdminDefinitionMap } from "@simpleblog/shared/admin";
import { VariousFieldsAdmin } from "./models/variousfields";

const adminDefinitions: AdminDefinitionMap = {
  user: {cls: UserAdmin, name: UserAdmin.getPrismaModelPlural()},
  category: {cls: CategoryAdmin, name: CategoryAdmin.getPrismaModelPlural()},
  post: {cls: PostAdmin, name: PostAdmin.getPrismaModelPlural()},
  poll: {cls: PollAdmin, name: PollAdmin.getPrismaModelPlural()},
  pollanswer: {cls: PollAnswerAdmin, name: PollAnswerAdmin.getPrismaModelPlural()},
  polloption: {cls: PollOptionAdmin, name: PollOptionAdmin.getPrismaModelPlural()},
  pollquestion: {cls: PollQuestionAdmin, name: PollQuestionAdmin.getPrismaModelPlural()},
  pollresponse: {cls: PollResponseAdmin, name: PollResponseAdmin.getPrismaModelPlural()},
  project: {cls: ProjectAdmin, name: ProjectAdmin.getPrismaModelPlural()},
  projectcategory: {cls: ProjectCategoryAdmin, name: ProjectCategoryAdmin.getPrismaModelPlural()},
  projectsubcategory: {cls: ProjectSubCategoryAdmin, name: ProjectSubCategoryAdmin.getPrismaModelPlural()},
  timetracking: {cls: TimeTrackingAdmin, name: TimeTrackingAdmin.getPrismaModelPlural()},
  variousfields: {cls: VariousFieldsAdmin, name: VariousFieldsAdmin.getPrismaModelPlural()},
};
export default adminDefinitions;
export {
  UserAdmin,
  CategoryAdmin,
  PostAdmin,
  PollAdmin,
  PollAnswerAdmin,
  PollOptionAdmin,
  PollQuestionAdmin,
  PollResponseAdmin,
  ProjectAdmin,
  ProjectCategoryAdmin,
  ProjectSubCategoryAdmin,
  TimeTrackingAdmin,
  VariousFieldsAdmin,
};
