// import { validate } from 'class-validator';
// import { plainToInstance } from 'class-transformer';
import UserModel from "../../Users/model/User.model.js";
import AppError from "../../utils/appError.js"
import catchsync from '../../utils/catchAsync.js'
// import { CreateUserDto } from '../../Dtos/user/user.dto.js';
export const getAllusers =catchsync( async (req ,res)=>{
    let user = await UserModel.find()
    res.status(200).json({message:"All Users",user})
})

export const creatuser = catchsync(async(req ,res)=>{
    let user = await UserModel.create(req.body)
    res.status(201).json({message:"User created",user})
})

export const getuserBYid = catchsync(async(req ,res)=>{
    let user = await UserModel.findById(req.params.id)
    if(!user){
        return next(new AppError("No user found with this id",404))
    }
    res.status(200).json({message:"User found",user})
}
)

export const updateuserBYid = catchsync(async(req ,res)=>{
    let{name,image,password} = req.body
    let user = await UserModel.findByIdAndUpdate(req.params.id,{name,image,password},{new:true})
    if(!user){
        return next(new AppError("No user found with this id",404))
    }
    res.status(200).json({message:"User updated",user})
}
)
 export const deleteuserBYid = catchsync(async(req ,res)=>{
    let user = await UserModel.findByIdAndDelete(req.params.id)
    if(!user){
        return next(new AppError("No user found with this id",404))
    }
    res.status(200).json({message:"User deleted",user})
}
)
