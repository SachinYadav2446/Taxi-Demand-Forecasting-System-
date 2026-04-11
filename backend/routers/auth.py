from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import models
import schemas
from database import get_db
from core.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register/operator", response_model=schemas.Token)
def register_operator(operator: schemas.OperatorCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Company).filter(models.Company.email == operator.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(operator.password)
    db_operator = models.Company(
        name=operator.name,
        email=operator.email,
        password_hash=hashed_password,
        fleet_size=operator.fleet_size
    )
    db.add(db_operator)
    db.commit()
    db.refresh(db_operator)

    # Automatically log them in by issuing a token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_operator.email, "role": "operator", "user_id": db_operator.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register/driver", response_model=schemas.Token)
def register_driver(driver: schemas.DriverCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Driver).filter(models.Driver.email == driver.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(driver.password)
    db_driver = models.Driver(
        name=driver.name,
        email=driver.email,
        password_hash=hashed_password
    )
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_driver.email, "role": "driver", "user_id": db_driver.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Check operator first, then driver
    user = db.query(models.Company).filter(models.Company.email == form_data.username).first()
    role = "operator"
    
    if not user:
        user = db.query(models.Driver).filter(models.Driver.email == form_data.username).first()
        role = "driver"
        
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": role, "user_id": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserProfile)
def get_me(current_user: dict = Depends(get_current_user)):
    user = current_user["user"]
    role = current_user["role"]

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": role,
        "fleet_size": getattr(user, "fleet_size", None),
    }

@router.put("/me", response_model=schemas.UserProfile)
def update_me(profile_update: schemas.UserProfileUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = current_user["user"]
    role = current_user["role"]

    if profile_update.name is not None:
        user.name = profile_update.name

    if role == "operator" and profile_update.fleet_size is not None:
        user.fleet_size = profile_update.fleet_size

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": role,
        "fleet_size": getattr(user, "fleet_size", None),
    }

@router.post("/change-password")
def change_password(
    payload: schemas.ChangePassword,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user = current_user["user"]

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Password updated successfully"}
